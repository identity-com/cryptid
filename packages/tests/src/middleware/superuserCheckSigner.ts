import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  Signer,
} from "@solana/web3.js";
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
import { VersionedTransaction } from "@solana/web3.js";
import { TransactionMessage } from "@solana/web3.js";

chai.use(chaiAsPromised);
const { expect } = chai;

describe.only("Middleware: superuserCheckSigner", () => {
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

  const convertToSignedVersionedTransaction = async (
    tx: Transaction,
    signers: Signer[] = []
  ): Promise<VersionedTransaction> => {
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: signer.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: tx.instructions,
    }).compileToV0Message();
    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([signer, ...signers]);
    return transaction;
  };

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

  before(
    "Create a cryptid client with the non-did signer as an authority (so that it can propose unauthorised transactions for the superuser middleware to authorise)",
    async () => {
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

      await fund(cryptid.address(), 20 * LAMPORTS_PER_SOL);

      console.log("Funded Cryptid Account", cryptid.address().toBase58());
    }
  );

  it.only("can execute a transfer if the tx is signed by the expected non-did signer", async () => {
    const previousBalance = await balanceOf(cryptid.address());

    console.log(
      "Signer:",
      signer.publicKey.toBase58(),
      "balance",
      await balanceOf(signer.publicKey)
    );
    console.log("Authority:", authority.publicKey.toBase58());

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
      authority,
      { connection: provider.connection }
    );
    // propose the Cryptid transaction
    const { proposeTransaction, transactionAccount, proposeSigners } =
      await cryptidWithoutMiddleware.propose(makeTransaction());
    await cryptidWithoutMiddleware.send(proposeTransaction, proposeSigners);

    // send the execute tx - this will fail since the middleware was not used
    const { executeTransactions } = await cryptid.execute(transactionAccount);
    const transaction = await convertToSignedVersionedTransaction(
      executeTransactions[0]
    );
    await provider.connection.sendTransaction(transaction);
    const shouldFail = cryptid.send(executeTransactions[0], [signer]);

    return expect(shouldFail).to.be.rejectedWith(
      "Error Code: IncorrectMiddleware"
    );
  });

  it("blocks a transfer not signed by the signer", async () => {
    // change the signer
    signer = Keypair.generate();

    // propose the Cryptid transaction. Since the superuserCheckSigner middleware
    // executes on propose, this tx will fail
    const { proposeTransaction, proposeSigners } = await cryptid.propose(
      makeTransaction()
    );
    const shouldFail = cryptid.send(proposeTransaction, proposeSigners);

    return expect(shouldFail).to.be.rejectedWith("Error Code: InvalidSigner.");
  });
});
