import { DID_SOL_PREFIX, DID_SOL_PROGRAM } from "@identity.com/sol-did-client";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  cryptidTransferInstruction,
  makeTransfer,
  toAccountMeta,
} from "./util/cryptid";
import { addKeyToDID, didTestCases, TestType } from "./util/did";
import { balanceOf, createTestContext, fund } from "./util/anchorUtils";
import {
  Cryptid,
  CryptidClient,
  InstructionData,
  TransactionAccountMeta,
} from "@identity.com/cryptid";

chai.use(chaiAsPromised);
const { expect } = chai;

didTestCases.forEach(({ didType, getDidAccount }) => {
  describe(`directExecute (${didType} DID)`, () => {
    const { program, authority, provider } = createTestContext();

    let didAccount: PublicKey;
    let cryptid: CryptidClient;

    const did = DID_SOL_PREFIX + ":" + authority.publicKey;

    // use this when testing directly against anchor
    const transferInstructionData =
      cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL
    // use this when testing against the cryptid client
    const makeTransaction = (recipient: PublicKey) =>
      makeTransfer(cryptid.address(), recipient);

    const directExecute = (
      recipient: Keypair,
      instructionData: InstructionData = transferInstructionData
    ) =>
      program.methods
        .directExecute(
          Buffer.from([]), // no controller chain
          [instructionData],
          cryptid.details.bump,
          cryptid.details.index,
          cryptid.details.didAccountBump,
          0 // flags
        )
        .accounts({
          cryptidAccount: cryptid.address(),
          didProgram: DID_SOL_PROGRAM,
          did: didAccount,
          signer: authority.publicKey,
        })
        .remainingAccounts([
          toAccountMeta(recipient.publicKey, true, false),
          toAccountMeta(SystemProgram.programId),
        ])
        .rpc();

    before("Set up DID account", async () => {
      await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
      [didAccount] = await getDidAccount(authority);
    });

    before("Set up generative Cryptid Account", async () => {
      cryptid = await Cryptid.buildFromDID(did, authority, {
        connection: provider.connection,
      });

      await fund(cryptid.address(), 20 * LAMPORTS_PER_SOL);
    });

    it("can retrieve and build the default cryptid account", async () => {
      const cryptidDetails = await Cryptid.findAll(did, {
        connection: provider.connection,
      });

      expect(cryptidDetails.length).to.equal(1);

      Cryptid.build(cryptidDetails[0], authority, {
        connection: provider.connection,
      });
    });

    it("can transfer through Cryptid", async () => {
      const recipient = Keypair.generate();

      const previousBalance = await balanceOf(cryptid.address());

      const signedTransaction = await cryptid.directExecute(
        makeTransaction(recipient.publicKey)
      );

      await cryptid.send(signedTransaction, [], { skipPreflight: true });

      const currentBalance = await balanceOf(cryptid.address());

      expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Should have lost 1 SOL
    });

    it("rejects the transfer if the cryptid account is not a signer", async () => {
      const recipient = Keypair.generate();

      const instructionDataWithUnauthorisedSigner =
        cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL

      // set the cryptid account as a non-signer on the transfer
      (
        instructionDataWithUnauthorisedSigner.accounts as TransactionAccountMeta[]
      )[0].meta = 2; // writable but not a signer

      // execute the Cryptid transaction
      const shouldFail = directExecute(
        recipient,
        instructionDataWithUnauthorisedSigner
      );

      return expect(shouldFail).to.be.rejectedWith(
        "missing required signature for instruction"
      );
    });

    it("rejects the transfer if the recipient account index is invalid", async () => {
      const recipient = Keypair.generate();

      // set the recipient account as an invalid account index
      const instructionDataWithInvalidAccountIndex =
        cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL
      (
        instructionDataWithInvalidAccountIndex.accounts as TransactionAccountMeta[]
      )[1].key = 100; // account 100 does not exist

      // execute the Cryptid transaction
      const shouldFail = directExecute(
        recipient,
        instructionDataWithInvalidAccountIndex
      );

      return expect(shouldFail).to.be.rejectedWith(
        "Program failed to complete"
      );
    });

    it("rejects the transfer if the signer is not a valid signer on the DID", async () => {
      const recipient = Keypair.generate();
      const bogusSigner = Keypair.generate();
      // fund the bogus signer, otherwise the tx fails due to lack of funds, not did signing issues
      await fund(bogusSigner.publicKey);

      const bogusCryptid = await Cryptid.buildFromDID(did, bogusSigner, {
        connection: provider.connection,
      });
      const signedTransaction = await bogusCryptid.directExecute(
        makeTransaction(recipient.publicKey)
      );
      const shouldFail = bogusCryptid.send(signedTransaction);

      return expect(shouldFail).to.be.rejectedWith(
        "Error Code: KeyMustBeSigner"
      );
    });

    it("can use direct-execute on non-zero index cryptid accounts", async () => {
      const recipient = Keypair.generate();

      const cryptidNonZeroIndex = await Cryptid.buildFromDID(did, authority, {
        accountIndex: 1,
        connection: provider.connection,
      });

      await fund(cryptidNonZeroIndex.address(), 3 * LAMPORTS_PER_SOL);

      const signedTransaction = await cryptidNonZeroIndex.directExecute(
        makeTransfer(cryptidNonZeroIndex.address(), recipient.publicKey)
      );

      await cryptidNonZeroIndex.send(signedTransaction);

      const previousBalance = await balanceOf(cryptidNonZeroIndex.address());
      expect(previousBalance).to.equal(2 * LAMPORTS_PER_SOL);
    });

    // Test-case for the initialized DID case only.
    if (didType === TestType.Initialized) {
      it("can transfer through Cryptid with a second key on the DID", async () => {
        const secondKey = Keypair.generate();
        await fund(secondKey.publicKey);

        const recipient = Keypair.generate();

        const secondKeyCryptid = await Cryptid.buildFromDID(did, secondKey, {
          connection: provider.connection,
        });

        // thunk to execute the Cryptid transaction
        const execute = async () => {
          const signedTransaction = await secondKeyCryptid.directExecute(
            makeTransaction(recipient.publicKey)
          );
          await secondKeyCryptid.send(signedTransaction);
        };

        const previousBalance = await balanceOf(cryptid.address());

        // should fail before the key is added:
        expect(execute()).to.be.rejected;

        // add the second key to the did
        await addKeyToDID(authority, secondKey.publicKey);

        // should pass afterwards
        await execute();

        const currentBalance = await balanceOf(cryptid.address());

        expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Should have lost 1 SOL
      });
    }
  });
});
