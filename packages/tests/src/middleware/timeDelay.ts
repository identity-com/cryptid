import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { makeTransfer } from "../util/cryptid";
import { fund, createTestContext, balanceOf, sleep } from "../util/anchorUtils";
import { DID_SOL_PREFIX } from "@identity.com/sol-did-client";
import { Cryptid } from "@identity.com/cryptid-hh";
import {
  TimeDelayMiddleware,
  deriveMiddlewareAccountAddress,
} from "@identity.com/cryptid-middleware-time-delay-hh";
import { CryptidClient } from "@identity.com/cryptid-core-hh";
import { initializeDIDAccount } from "../util/did";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("Middleware: timeDelay", () => {
  const {
    provider,
    keypair,
    authority,
    middleware: { timeDelay: timeDelayMiddlewareProgram },
  } = createTestContext();

  // this middleware allows the transaction to be executed after a delay of 100s
  let slowMiddlewareAccount: PublicKey;
  // this middleware allows the transaction to be executed after a delay of 1s
  let fastMiddlewareAccount: PublicKey;

  let slowCryptid: CryptidClient;
  let fastCryptid: CryptidClient;
  let cryptidIndex = 0;

  const recipient = Keypair.generate();

  const makeTransaction = (cryptid: CryptidClient) =>
    makeTransfer(cryptid.address(), recipient.publicKey);

  before("Set up DID account", async () => {
    await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
    await initializeDIDAccount(authority);
  });

  before("Set up middleware PDA", async () => {
    [slowMiddlewareAccount] = deriveMiddlewareAccountAddress(
      authority.publicKey,
      100
    );
    [fastMiddlewareAccount] = deriveMiddlewareAccountAddress(
      authority.publicKey,
      1
    );

    // create a time-delay middleware that blocks for 100s
    const slowMiddlewareTx = await new TimeDelayMiddleware().createMiddleware({
      seconds: 100,
      authority,
      connection: provider.connection,
      opts: {},
    });
    await provider.sendAndConfirm(slowMiddlewareTx, [keypair]);

    // create a time-delay middleware that blocks for 1 second
    const fastMiddlewareTx = await new TimeDelayMiddleware().createMiddleware({
      seconds: 1,
      authority,
      connection: provider.connection,
      opts: {},
    });

    await provider.sendAndConfirm(fastMiddlewareTx, [keypair]);
  });

  before("Set up Cryptid Account with middleware", async () => {
    slowCryptid = await Cryptid.createFromDID(
      DID_SOL_PREFIX + ":" + authority.publicKey,
      authority,
      [
        {
          programId: timeDelayMiddlewareProgram.programId,
          address: slowMiddlewareAccount,
        },
      ],
      { connection: provider.connection, accountIndex: ++cryptidIndex }
    );

    fastCryptid = await Cryptid.createFromDID(
      DID_SOL_PREFIX + ":" + authority.publicKey,
      authority,
      [
        {
          programId: timeDelayMiddlewareProgram.programId,
          address: fastMiddlewareAccount,
        },
      ],
      { connection: provider.connection, accountIndex: ++cryptidIndex }
    );

    await fund(slowCryptid.address(), 20 * LAMPORTS_PER_SOL);
    await fund(fastCryptid.address(), 20 * LAMPORTS_PER_SOL);
  });

  it("cannot immediately execute a transfer", async () => {
    // propose the Cryptid transaction
    const { proposeTransaction, transactionAccount, proposeSigners } =
      await slowCryptid.propose(makeTransaction(slowCryptid));

    await slowCryptid.send(proposeTransaction, proposeSigners);

    // send the execute tx, which fails to pass through the middleware
    const { executeTransactions, executeSigners } = await slowCryptid.execute(
      transactionAccount
    );
    const shouldFail = slowCryptid.send(executeTransactions[0], executeSigners);

    // TODO expose the error message
    return expect(shouldFail).to.be.rejected;
  });

  it("can execute a transfer after waiting", async () => {
    const previousBalance = await balanceOf(fastCryptid.address());

    // propose the Cryptid transaction
    const { proposeTransaction, transactionAccount, proposeSigners } =
      await fastCryptid.propose(makeTransaction(fastCryptid));
    await fastCryptid.send(proposeTransaction, proposeSigners);

    // wait for the transaction to be ready
    await sleep(2000);

    // execute the Cryptid transaction (passing the middleware)
    const { executeTransactions, executeSigners } = await fastCryptid.execute(
      transactionAccount
    );
    await fastCryptid.send(executeTransactions[0], executeSigners);

    const currentBalance = await balanceOf(fastCryptid.address());
    expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Now the tx has been executed
  });
});
