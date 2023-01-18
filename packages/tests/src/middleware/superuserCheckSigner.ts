import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { makeTransfer } from "../util/cryptid";
import { initializeDIDAccount } from "../util/did";
import { balanceOf, createTestContext, fund } from "../util/anchorUtils";
import { DID_SOL_PREFIX } from "@identity.com/sol-did-client";
import { Cryptid } from "@identity.com/cryptid";
import {
  SuperuserCheckSignerMiddleware,
  deriveMiddlewareAccountAddress,
} from "@identity.com/cryptid-middleware-superuser-check-signer";
import { CryptidClient } from "@identity.com/cryptid-core";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("Middleware: superuserCheckSigner", () => {
  const {
    keypair,
    provider,
    authority,
    middleware: { superuserCheckSigner: superuserCheckSignerMiddlewareProgram },
  } = createTestContext();

  let cryptid: CryptidClient;
  const cryptidIndex = 1;

  let middlewareAccount: PublicKey;

  let signer = Keypair.generate();

  const makeTransaction = (to = signer.publicKey) =>
    makeTransfer(cryptid.address(), to);

  before("Fund the authority and signer", async () => {
    await Promise.all([
      fund(authority.publicKey, LAMPORTS_PER_SOL),
      fund(signer.publicKey, LAMPORTS_PER_SOL),
    ]);
  });

  before("Set up DID account", async () => {
    await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
    await initializeDIDAccount(authority);
  });

  before("Set up middleware PDA", async () => {
    [middlewareAccount] = deriveMiddlewareAccountAddress(
      authority.publicKey,
      signer.publicKey
    );

    const middlewareTx =
      await new SuperuserCheckSignerMiddleware().createMiddleware({
        signer: signer.publicKey,
        authority,
        connection: provider.connection,
        opts: {},
      });
    await provider.sendAndConfirm(middlewareTx, [keypair]);
  });

  before(
    "Set up Cryptid Account with middleware (this is signed by an authority on the DID)",
    async () => {
      const c = await Cryptid.createFromDID(
        DID_SOL_PREFIX + ":" + authority.publicKey,
        authority,
        [
          {
            programId: superuserCheckSignerMiddlewareProgram.programId,
            address: middlewareAccount,
            isSuperuser: true,
          },
        ],
        { connection: provider.connection, accountIndex: cryptidIndex }
      );

      console.log("Created Cryptid Account", c.address().toBase58());
    }
  );

  const buildCryptid = async () => {
    cryptid = (
      await Cryptid.buildFromDID(
        DID_SOL_PREFIX + ":" + authority.publicKey,
        signer,
        {
          connection: provider.connection,
          accountIndex: cryptidIndex,
          middlewares: [
            {
              programId: superuserCheckSignerMiddlewareProgram.programId,
              address: middlewareAccount,
              isSuperuser: true,
            },
          ],
        }
      )
    ).unauthorized();
  };

  before(
    "Create a cryptid client with the non-did signer as an authority (so that it can propose unauthorised transactions for the superuser middleware to authorise)",
    async () => {
      await buildCryptid();

      await fund(cryptid.address(), 20 * LAMPORTS_PER_SOL);

      console.log("Funded Cryptid Account", cryptid.address().toBase58());
    }
  );

  it("can execute a transfer if the tx is signed by the expected non-did signer", async () => {
    const previousBalance = await balanceOf(cryptid.address());

    // propose the Cryptid transaction
    const { proposeTransaction, transactionAccount, proposeSigners } =
      await cryptid.propose(makeTransaction());
    // this will be signed by the non-did signer
    await cryptid.send(proposeTransaction, proposeSigners);

    console.log("Proposed transaction", transactionAccount.toBase58());

    // send the execute tx
    const { executeTransactions } = await cryptid.execute(transactionAccount);
    await cryptid.send(executeTransactions[0]);

    const currentBalance = await balanceOf(cryptid.address());
    expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Now the tx has been executed
  });

  it("blocks a transfer not passed by the middleware", async () => {
    const cryptidWithoutMiddleware = Cryptid.build(
      {
        ...cryptid.details,
        middlewares: [],
      },
      signer,
      { connection: provider.connection }
    ).unauthorized();

    // propose the Cryptid transaction
    const { proposeTransaction, transactionAccount, proposeSigners } =
      await cryptidWithoutMiddleware.propose(makeTransaction());
    await cryptidWithoutMiddleware.send(proposeTransaction, proposeSigners);

    // send the execute tx - this will fail since the middleware was not used
    const { executeTransactions } = await cryptidWithoutMiddleware.execute(
      transactionAccount
    );

    const shouldFail = cryptidWithoutMiddleware.send(executeTransactions[0], [
      signer,
    ]);

    // Unauthorized, because the transaction account was not authorized by the SuperUserMiddleware
    return expect(shouldFail).to.be.rejectedWith(
      "Error Code: UnauthorizedTransaction."
    );
  });

  it("blocks a transfer not signed by the signer", async () => {
    // change the signer
    signer = Keypair.generate();
    await fund(signer.publicKey);
    await buildCryptid();

    // propose the Cryptid transaction. Since the superuserCheckSigner middleware
    // executes on propose, this tx will fail
    const { proposeTransaction, transactionAccount, proposeSigners } =
      await cryptid.propose(makeTransaction());
    await cryptid.send(proposeTransaction, proposeSigners);

    const { executeTransactions, executeSigners } = await cryptid.execute(
      transactionAccount
    );

    const shouldFail = cryptid.send(executeTransactions[0], executeSigners);

    return expect(shouldFail).to.be.rejectedWith("Error Code: InvalidSigner.");
  });
});
