import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { makeTransfer, toAccountMeta } from "../util/cryptid";
import { initializeDIDAccount } from "../util/did";
import { balanceOf, createTestContext, fund } from "../util/anchorUtils";
import { DID_SOL_PREFIX, DID_SOL_PROGRAM } from "@identity.com/sol-did-client";
import { Cryptid, TransactionState } from "@identity.com/cryptid";
import {
  SuperuserCheckSignerMiddleware,
  deriveMiddlewareAccountAddress,
} from "@identity.com/cryptid-middleware-superuser-check-signer";
import { CryptidClient } from "@identity.com/cryptid-core";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("Middleware: superuserCheckSigner", () => {
  const {
    program,
    keypair,
    provider,
    authority,
    middleware: { superuserCheckSigner: superuserCheckSignerMiddlewareProgram },
  } = createTestContext();

  let cryptid: CryptidClient;
  let authorizedCryptid: CryptidClient;

  const cryptidIndex = 1;

  let middlewareAccount: PublicKey;

  let signer = Keypair.generate();

  const makeTransaction = (to = signer.publicKey) =>
    makeTransfer(cryptid.address(), to);

  const execute = (transactionAccount: PublicKey) =>
    // execute the Cryptid transaction
    program.methods
      .executeTransaction(
        [], // no controller chain
        cryptid.details.bump,
        cryptid.details.index,
        cryptid.details.didAccountBump,
        0
      )
      .accounts({
        cryptidAccount: cryptid.address(),
        didProgram: DID_SOL_PROGRAM,
        did: cryptid.details.didAccount,
        authority: signer.publicKey,
        destination: signer.publicKey,
        transactionAccount,
      })
      .remainingAccounts([
        toAccountMeta(signer.publicKey, true, false),
        toAccountMeta(SystemProgram.programId),
      ])
      .signers([signer])
      .rpc();

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

    authorizedCryptid = await Cryptid.buildFromDID(
      DID_SOL_PREFIX + ":" + authority.publicKey,
      authority,
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
    );
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
    const { transactions } = await cryptid.execute(transactionAccount);
    await cryptid.send(transactions[0]);

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
    const { transactions } = await cryptidWithoutMiddleware.execute(
      transactionAccount
    );

    const shouldFail = cryptidWithoutMiddleware.send(transactions[0], [signer]);

    // Unauthorized, because the transaction account was not authorized by the SuperUserMiddleware
    return expect(shouldFail).to.be.rejectedWith(
      "Error Code: UnauthorizedTransaction."
    );
  });

  it("cannot execute with an unauthorized signer if the transaction was proposed by none (middleware error)", async () => {
    // propose the Cryptid transaction
    const { proposeTransaction, transactionAccount, proposeSigners } =
      await authorizedCryptid.propose(makeTransaction());
    // this will be signed by a DID authority
    await authorizedCryptid.send(proposeTransaction, proposeSigners);

    // This should fail!
    const { transactions, signers } = await cryptid.execute(transactionAccount);

    const shouldFail = cryptid.send(transactions[0], signers);

    return expect(shouldFail).to.be.rejectedWith(
      "Error Code: AlreadyAuthorizedTransactionAccount"
    );
  });

  it("cannot execute with an unauthorized signer if the transaction was proposed by none (execute error)", async () => {
    // propose the Cryptid transaction
    const { proposeTransaction, transactionAccount, proposeSigners } =
      await authorizedCryptid.propose(makeTransaction());
    // this will be signed by a DID authority
    await authorizedCryptid.send(proposeTransaction, proposeSigners);

    // This should fail!
    // Manual execute skips the middleware execution. (which would fail)
    const shouldFail = execute(transactionAccount);

    return expect(shouldFail).to.be.rejectedWith("Error Code: KeyMustBeSigner");
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

    const { transactions, signers } = await cryptid.execute(transactionAccount);

    const shouldFail = cryptid.send(transactions[0], signers);

    return expect(shouldFail).to.be.rejectedWith("Error Code: InvalidSigner.");
  });

  it("cannot extend with an unauthorized signer of the transaction was proposed by none", async () => {
    // propose the Cryptid transaction
    const { proposeTransaction, transactionAccount, proposeSigners } =
      await authorizedCryptid.propose(
        makeTransaction(),
        TransactionState.NotReady
      );
    // this will be signed by the non-did signer
    await authorizedCryptid.send(proposeTransaction, proposeSigners);

    // This should fail!
    const extendTx = await cryptid.extend(
      transactionAccount,
      makeTransaction()
    );
    const shouldFail = cryptid.send(extendTx, []);

    return expect(shouldFail).to.be.rejectedWith(
      "Error Code: KeyMustBeSigner."
    );
  });
});
