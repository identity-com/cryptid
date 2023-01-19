import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { makeTransfer } from "../util/cryptid";
import { initializeDIDAccount } from "../util/did";
import { balanceOf, createTestContext, fund } from "../util/anchorUtils";
import { DID_SOL_PREFIX } from "@identity.com/sol-did-client";
import { Cryptid, TransactionState } from "@identity.com/cryptid";
import {
  CheckRecipientMiddleware,
  deriveMiddlewareAccountAddress,
} from "@identity.com/cryptid-middleware-check-recipient";
import { CryptidClient } from "@identity.com/cryptid-core";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("Middleware: checkRecipient", () => {
  const {
    keypair,
    provider,
    authority,
    middleware: { checkRecipient: checkRecipientMiddlewareProgram },
  } = createTestContext();

  let cryptid: CryptidClient;
  let cryptidIndex = 0;

  let middlewareAccount: PublicKey;

  let recipient = Keypair.generate();

  const makeTransaction = (to = recipient.publicKey) =>
    makeTransfer(cryptid.address(), to);

  before("Set up DID account", async () => {
    await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
    await initializeDIDAccount(authority);
  });

  before("Set up middleware PDA", async () => {
    [middlewareAccount] = deriveMiddlewareAccountAddress(
      authority.publicKey,
      recipient.publicKey
    );

    const middlewareTx = await new CheckRecipientMiddleware().createMiddleware({
      recipient: recipient.publicKey,
      authority,
      connection: provider.connection,
      opts: {},
    });
    await provider.sendAndConfirm(middlewareTx, [keypair]);
  });

  before("Set up Cryptid Account with middleware", async () => {
    cryptid = await Cryptid.createFromDID(
      DID_SOL_PREFIX + ":" + authority.publicKey,
      authority,
      [
        {
          programId: checkRecipientMiddlewareProgram.programId,
          address: middlewareAccount,
          isSuperuser: false,
        },
      ],
      { connection: provider.connection, accountIndex: ++cryptidIndex }
    );

    await fund(cryptid.address(), 20 * LAMPORTS_PER_SOL);
  });

  it("can execute a transfer to the specified recipient", async () => {
    const previousBalance = await balanceOf(cryptid.address());

    console.log("creating");

    // propose the Cryptid transaction
    const { proposeTransaction, transactionAccount, proposeSigners } =
      await cryptid.propose(makeTransaction());

    console.log("sending");
    await cryptid.send(proposeTransaction, proposeSigners);

    // send the execute tx
    const { transactions, signers } = await cryptid.execute(transactionAccount);
    await cryptid.send(transactions[0], signers);

    const currentBalance = await balanceOf(cryptid.address());
    expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Now the tx has been executed
  });

  it("blocks a transfer not passed by the middleware", async () => {
    const cryptidWithoutMiddleware = Cryptid.build(
      {
        ...cryptid.details,
        middlewares: [],
      },
      authority,
      { connection: provider.connection }
    );
    // propose the Cryptid transaction
    const { proposeTransaction, transactionAccount, proposeSigners } =
      await cryptidWithoutMiddleware.propose(makeTransaction());
    await cryptidWithoutMiddleware.send(proposeTransaction, proposeSigners);

    // send the execute tx - this will fail since the middleware was not used
    const { transactions, signers } = await cryptid.execute(transactionAccount);
    const shouldFail = cryptid.send(transactions[0], signers);

    return expect(shouldFail).to.be.rejectedWith(
      "Error Code: IncorrectMiddleware"
    );
  });

  it("blocks a transfer to a different recipient", async () => {
    // change the recipient
    recipient = Keypair.generate();

    // propose the Cryptid transaction. Since the checkRecipient middleware
    // executes on propose, this tx will fail
    const { proposeTransaction, proposeSigners } = await cryptid.propose(
      makeTransaction()
    );
    const shouldFail = cryptid.send(proposeTransaction, proposeSigners);

    return expect(shouldFail).to.be.rejectedWith(
      "Error Code: InvalidRecipient."
    );
  });

  it("blocks a transfer when proposing a transaction in NotReady state and later sealed (ie extended with no txes)", async () => {
    // change the recipient
    recipient = Keypair.generate();

    // propose the Cryptid transaction. Since the checkRecipient middleware
    // is not executed until the tx is marked as Ready, this tx will pass.
    const { proposeTransaction, proposeSigners, transactionAccount } =
      await cryptid.propose(makeTransaction(), TransactionState.NotReady);
    await cryptid.send(proposeTransaction, proposeSigners);

    // extend and seal the transaction
    const extendTransaction = await cryptid.extend(
      transactionAccount,
      new Transaction(),
      TransactionState.Ready
    );
    const shouldFail = cryptid.send(extendTransaction);

    return expect(shouldFail).to.be.rejectedWith(
      "Error Code: InvalidRecipient."
    );
  });
});
