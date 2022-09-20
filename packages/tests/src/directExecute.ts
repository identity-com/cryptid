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
import { addKeyToDID, initializeDIDAccount } from "./util/did";
import { fund, createTestContext, balanceOf } from "./util/anchorUtils";
import {
  Cryptid,
  CryptidClient,
  InstructionData,
  TransactionAccountMeta,
} from "@identity.com/cryptid";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("directExecute", () => {
  const { program, authority, provider } = createTestContext();

  let didAccount: PublicKey;
  let cryptidAccount: PublicKey;
  let cryptidBump: number;

  let cryptid: CryptidClient;

  // use this when testing directly against anchor
  const transferInstructionData = cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL
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
    didAccount = await initializeDIDAccount(authority);
  });

  before("Set up generative Cryptid Account", async () => {
    [cryptidAccount, cryptidBump] = await deriveCryptidAccountAddress(
      didAccount
    );
    cryptid = await Cryptid.buildFromDID(
      DID_SOL_PREFIX + ":" + authority.publicKey,
      authority,
      { connection: provider.connection }
    );

    await fund(cryptidAccount, 20 * LAMPORTS_PER_SOL);
  });

  it("can transfer through Cryptid", async () => {
    const recipient = Keypair.generate();

    const previousBalance = await balanceOf(cryptidAccount);

    const signedTransaction = await cryptid.sign(
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

    const bogusCryptid = await Cryptid.buildFromDID(
      DID_SOL_PREFIX + ":" + authority.publicKey,
      bogusSigner,
      { connection: provider.connection }
    );
    const signedTransaction = await bogusCryptid.sign(
      makeTransaction(recipient.publicKey)
    );
    const shouldFail = bogusCryptid.send(signedTransaction, {
      skipPreflight: true,
    });

    // TODO expose the error from the program
    return expect(shouldFail).to.be.rejected;
  });

  it("can transfer through Cryptid with a second key on the DID", async () => {
    const secondKey = Keypair.generate();
    await fund(secondKey.publicKey);

    const recipient = Keypair.generate();

    const secondKeyCryptid = await Cryptid.buildFromDID(
      DID_SOL_PREFIX + ":" + authority.publicKey,
      secondKey,
      { connection: provider.connection }
    );

    // thunk to execute the Cryptid transaction
    const execute = async () => {
      const signedTransaction = await secondKeyCryptid.sign(
        makeTransaction(recipient.publicKey)
      );
      await secondKeyCryptid.send(signedTransaction, { skipPreflight: true });
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
});
