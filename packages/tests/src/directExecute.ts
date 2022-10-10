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
  deriveCryptidAccountAddress,
  makeTransfer,
  toAccountMeta,
} from "./util/cryptid";
import { addKeyToDID, didTestCases, DidTestType } from "./util/did";
import { balanceOf, createTestContext, fund } from "./util/anchorUtils";
import {
  Cryptid,
  CryptidClient,
  InstructionData,
  TransactionAccountMeta,
} from "@identity.com/cryptid";

chai.use(chaiAsPromised);
const { expect } = chai;

didTestCases.forEach(({ type, beforeFn }) => {
  describe(`directExecute (${type})`, () => {
    const { program, authority, provider } = createTestContext();

    let didAccount: PublicKey;
    let didAccountBump: number;

    let cryptidAccount: PublicKey;
    let cryptidBump: number;

    let cryptid: CryptidClient;

    const did = DID_SOL_PREFIX + ":" + authority.publicKey;

    // use this when testing directly against anchor
    const transferInstructionData =
      cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL
    // use this when testing against the cryptid client
    const makeTransaction = (recipient: PublicKey) =>
      makeTransfer(cryptidAccount, recipient);

    const directExecute = (
      recipient: Keypair,
      instructionData: InstructionData = transferInstructionData
    ) =>
      program.methods
        .directExecute(
          Buffer.from([]), // no controller chain
          [instructionData],
          cryptidBump,
          didAccountBump,
          0
        )
        .accounts({
          cryptidAccount,
          didProgram: DID_SOL_PROGRAM,
          did: didAccount,
          signer: authority.publicKey,
        })
        .remainingAccounts([
          toAccountMeta(recipient.publicKey, true, false),
          toAccountMeta(SystemProgram.programId),
        ])
        .rpc({ skipPreflight: true });

    before("Set up DID account", async () => {
      await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
      [didAccount, didAccountBump] = await beforeFn(authority);
    });

    before("Set up generative Cryptid Account", async () => {
      [cryptidAccount, cryptidBump] = deriveCryptidAccountAddress(didAccount);

      cryptid = await Cryptid.buildFromDID(did, authority, {
        connection: provider.connection,
      });

      await fund(cryptidAccount, 20 * LAMPORTS_PER_SOL);
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

      const previousBalance = await balanceOf(cryptidAccount);

      const signedTransaction = await cryptid.directExecute(
        makeTransaction(recipient.publicKey)
      );
      await cryptid.send(signedTransaction, { skipPreflight: true });

      const currentBalance = await balanceOf(cryptidAccount);

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

      return expect(shouldFail).to.be.rejectedWith(/MissingRequiredSignature/);
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

      // TODO expose the error from the program
      return expect(shouldFail).to.be.rejectedWith(/ProgramFailedToComplete/);
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
      const shouldFail = bogusCryptid.send(signedTransaction, {
        skipPreflight: true,
      });

      // TODO expose the error from the program
      return expect(shouldFail).to.be.rejected;
    });

    // Test-case for the initialized DID case only.
    if (type === DidTestType.Initialized) {
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
          await secondKeyCryptid.send(signedTransaction, {
            skipPreflight: true,
          });
        };

        const previousBalance = await balanceOf(cryptidAccount);

        // should fail before the key is added:
        expect(execute()).to.be.rejected;

        // add the second key to the did
        await addKeyToDID(authority, secondKey.publicKey);

        // should pass afterwards
        await execute();

        const currentBalance = await balanceOf(cryptidAccount);

        expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Should have lost 1 SOL
      });
    }
  });
});
