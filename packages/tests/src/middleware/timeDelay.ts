import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  createCryptidAccount,
  cryptidTransferInstruction,
  deriveTimeDelayMiddlewareAccountAddress,
  deriveTimeDelayTransactionStateMiddlewareAccountAddress,
  toAccountMeta,
} from "../util/cryptid";
import { initializeDIDAccount } from "../util/did";
import { fund, createTestContext, balanceOf, sleep } from "../util/anchorUtils";
import { DID_SOL_PROGRAM } from "@identity.com/sol-did-client";
import BN from "bn.js";
import { InstructionData, CRYPTID_PROGRAM } from "@identity.com/cryptid";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("Middleware: timeDelay", () => {
  const {
    program,
    authority,
    middleware: { timeDelay: timeDelayMiddlewareProgram },
  } = createTestContext();

  let didAccount: PublicKey;

  // this middleware allows the transaction to be executed after a delay of 100s
  let slowMiddlewareAccount: PublicKey;
  let slowMiddlewareBump: number;

  // this middleware allows the transaction to be executed after a delay of 1s
  let fastMiddlewareAccount: PublicKey;
  let fastMiddlewareBump: number;

  let slowCryptidAccount: PublicKey;

  let fastCryptidAccount: PublicKey;
  let fastCryptidBump: number;

  const recipient = Keypair.generate();
  const transferInstructionData = cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL

  const propose = async (
    cryptidAccount: PublicKey,
    transactionAccount: Keypair,
    instruction: InstructionData = transferInstructionData
  ) =>
    program.methods
      .proposeTransaction([instruction], 2)
      .accounts({
        cryptidAccount,
        owner: didAccount,
        authority: authority.publicKey,
        transactionAccount: transactionAccount.publicKey,
      })
      .remainingAccounts([
        toAccountMeta(recipient.publicKey, true, false),
        toAccountMeta(SystemProgram.programId),
      ])
      .signers([transactionAccount])
      .rpc({ skipPreflight: true }); // skip preflight so we see validator logs on error

  const execute = (
    cryptidAccount: PublicKey,
    cryptidBump: number,
    transactionAccount: Keypair
  ) =>
    // execute the Cryptid transaction
    program.methods
      .executeTransaction(
        Buffer.from([]), // no controller chain
        cryptidBump,
        0
      )
      .accounts({
        cryptidAccount,
        didProgram: DID_SOL_PROGRAM,
        did: didAccount,
        signer: authority.publicKey,
        destination: authority.publicKey,
        transactionAccount: transactionAccount.publicKey,
      })
      .remainingAccounts([
        toAccountMeta(recipient.publicKey, true, false),
        toAccountMeta(SystemProgram.programId),
      ])
      .rpc({ skipPreflight: true }); // skip preflight so we see validator logs on error

  const registerTransactionState = async (
    transactionAccount: Keypair,
    middlewareAccount: PublicKey
  ): Promise<[PublicKey, number]> => {
    const [transactionStateAddress, transactionStateBump] =
      await deriveTimeDelayTransactionStateMiddlewareAccountAddress(
        transactionAccount.publicKey
      );
    await timeDelayMiddlewareProgram.methods
      .registerTransaction()
      .accounts({
        middlewareAccount,
        transactionAccount: transactionAccount.publicKey,
        transactionCreateTime: transactionStateAddress,
        authority: authority.publicKey,
      })
      .rpc({ skipPreflight: true }); // skip preflight so we see validator logs on error

    return [transactionStateAddress, transactionStateBump];
  };

  const timeDelay = (
    transactionAccount: Keypair,
    middlewareAccount: PublicKey,
    transactionState: PublicKey,
    transactionStateBump: number
  ) =>
    // execute the check recipient middleware, to ensure that the correct recipient is used in the tx
    timeDelayMiddlewareProgram.methods
      .executeMiddleware(transactionStateBump)
      .accounts({
        middlewareAccount,
        transactionAccount: transactionAccount.publicKey,
        destination: authority.publicKey,
        transactionCreateTime: transactionState,
        cryptidProgram: CRYPTID_PROGRAM,
      })
      .rpc({ skipPreflight: true }); // skip preflight so we see validator logs on error

  before("Set up DID account", async () => {
    await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
    didAccount = await initializeDIDAccount(authority);
  });

  before("Set up middleware PDA", async () => {
    [slowMiddlewareAccount, slowMiddlewareBump] =
      await deriveTimeDelayMiddlewareAccountAddress(authority.publicKey, 100);
    [fastMiddlewareAccount, fastMiddlewareBump] =
      await deriveTimeDelayMiddlewareAccountAddress(authority.publicKey, 1);

    // create a time-delay middleware that blocks for one epoch
    await timeDelayMiddlewareProgram.methods
      .create(new BN(100), slowMiddlewareBump)
      .accounts({
        middlewareAccount: slowMiddlewareAccount,
        authority: authority.publicKey,
      })
      .rpc({ skipPreflight: true });

    await timeDelayMiddlewareProgram.methods
      .create(new BN(1), fastMiddlewareBump)
      .accounts({
        middlewareAccount: fastMiddlewareAccount,
        authority: authority.publicKey,
      })
      .rpc({ skipPreflight: true });
  });

  before("Set up Cryptid Account with middleware", async () => {
    [slowCryptidAccount] = await createCryptidAccount(
      program,
      didAccount,
      slowMiddlewareAccount,
      0
    );
    [fastCryptidAccount, fastCryptidBump] = await createCryptidAccount(
      program,
      didAccount,
      fastMiddlewareAccount,
      1
    );

    if (!process.env.QUIET) {
      console.log("Accounts", {
        didAccount: didAccount.toBase58(),
        slowCryptidAccount: slowCryptidAccount.toBase58(),
        slowMiddlewareAccount: slowMiddlewareAccount.toBase58(),
        fastCryptidAccount: fastCryptidAccount.toBase58(),
        fastMiddlewareAccount: fastMiddlewareAccount.toBase58(),
        authority: authority.publicKey.toBase58(),
        recipient: recipient.publicKey.toBase58(),
      });
    }

    await fund(slowCryptidAccount, 20 * LAMPORTS_PER_SOL);
    await fund(fastCryptidAccount, 20 * LAMPORTS_PER_SOL);
  });

  it("cannot immediately execute a transfer", async () => {
    const transactionAccount = Keypair.generate();

    // propose the Cryptid transaction
    await propose(slowCryptidAccount, transactionAccount);

    // register the transaction state
    const [transactionState, transactionStateBump] =
      await registerTransactionState(transactionAccount, slowMiddlewareAccount);

    // attempt to pass through the middleware
    const shouldFail = timeDelay(
      transactionAccount,
      slowMiddlewareAccount,
      transactionState,
      transactionStateBump
    );

    // TODO expose the error message
    return expect(shouldFail).to.be.rejected;
  });

  it("can execute a transfer after waiting", async () => {
    const previousBalance = await balanceOf(fastCryptidAccount);

    const transactionAccount = Keypair.generate();

    // propose the Cryptid transaction
    await propose(fastCryptidAccount, transactionAccount);

    // register the transaction state
    const [transactionState, transactionStateBump] =
      await registerTransactionState(transactionAccount, fastMiddlewareAccount);

    // wait for the transaction to be ready
    await sleep(2000);

    // pass through the middleware
    await timeDelay(
      transactionAccount,
      fastMiddlewareAccount,
      transactionState,
      transactionStateBump
    );

    // execute the Cryptid transaction
    await execute(fastCryptidAccount, fastCryptidBump, transactionAccount);

    const currentBalance = await balanceOf(fastCryptidAccount);
    expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Now the tx has been executed
  });
});
