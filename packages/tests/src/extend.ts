import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { cryptidTestCases, makeTransfer } from "./util/cryptid";
import {
  addKeyToDID,
  didTestCases,
  initializeDIDAccount,
  isDIDInitialized,
} from "./util/did";
import { fund, createTestContext, balanceOf } from "./util/anchorUtils";
import { DID_SOL_PREFIX } from "@identity.com/sol-did-client";
import { CryptidClient, TransactionState } from "@identity.com/cryptid";
import { CryptidBuilder } from "@identity.com/cryptid-core/dist/api/cryptidBuilder";

chai.use(chaiAsPromised);
const { expect } = chai;

didTestCases.forEach(({ didType, getDidAccount }) => {
  cryptidTestCases.forEach(({ cryptidType, getCryptidClient }) => {
    describe(`extend (${didType} DID, ${cryptidType} Cryptid)`, () => {
      const { provider, authority } = createTestContext();
      const did = DID_SOL_PREFIX + ":" + authority.publicKey;

      const recipient = Keypair.generate();

      let cryptid: CryptidClient;

      const makeTransaction = () =>
        makeTransfer(cryptid.address(), recipient.publicKey);

      const initializeDIDIfNecessary = async () => {
        const initialized = await isDIDInitialized(did, provider.connection);
        console.log("initialized", initialized);
        if (!initialized) {
          return initializeDIDAccount(authority);
        }
      };

      before(`Set up ${didType} DID account`, async () => {
        await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
        await getDidAccount(authority);
      });

      before(`Set up a ${cryptidType} Cryptid Account`, async () => {
        cryptid = await getCryptidClient(did, authority, {
          connection: provider.connection,
        });

        await fund(cryptid.address(), 20 * LAMPORTS_PER_SOL);
      });

      it("can extend a transaction with no new accounts", async () => {
        const previousBalance = await balanceOf(cryptid.address());

        // send the propose tx (in unready state)
        const { proposeTransaction, transactionAccount, proposeSigners } =
          await cryptid.propose(makeTransaction(), TransactionState.NotReady);

        await cryptid.send(proposeTransaction, proposeSigners);

        // extend the transaction
        const extendTx = await cryptid.extend(
          transactionAccount,
          makeTransaction()
        );
        await cryptid.send(extendTx, []);

        // seal the transaction
        const { sealTransaction, sealSigners } = await cryptid.seal(
          transactionAccount
        );
        await cryptid.send(sealTransaction, sealSigners);

        // send the execute tx
        const { executeTransactions } = await cryptid.execute(
          transactionAccount
        );
        await cryptid.send(executeTransactions[0]);

        const currentBalance = await balanceOf(cryptid.address());
        // Both txes have been executed
        expect(previousBalance - currentBalance).to.equal(2 * LAMPORTS_PER_SOL);
      });

      it("can extend a transaction with new accounts", async () => {
        const recipient1 = Keypair.generate();
        const recipient2 = Keypair.generate();

        const transferToRecipient1 = makeTransfer(
          cryptid.address(),
          recipient1.publicKey
        );
        const transferToRecipient2 = makeTransfer(
          cryptid.address(),
          recipient2.publicKey
        );

        // propose a transfer to recipient 1
        const { proposeTransaction, transactionAccount, proposeSigners } =
          await cryptid.propose(
            transferToRecipient1,
            TransactionState.NotReady
          );

        await cryptid.send(proposeTransaction, proposeSigners);

        // extend the transaction with a transfer to recipient 2
        const extendTx = await cryptid.extend(
          transactionAccount,
          transferToRecipient2
        );
        await cryptid.send(extendTx, []);

        // seal the transaction
        const { sealTransaction, sealSigners } = await cryptid.seal(
          transactionAccount
        );
        await cryptid.send(sealTransaction, sealSigners);

        // send the execute tx
        const { executeTransactions } = await cryptid.execute(
          transactionAccount
        );
        await cryptid.send(executeTransactions[0]);

        const recipient1Balance = await balanceOf(recipient1.publicKey);
        const recipient2Balance = await balanceOf(recipient2.publicKey);

        // Both txes have been executed
        expect(recipient1Balance).to.equal(LAMPORTS_PER_SOL);
        expect(recipient2Balance).to.equal(LAMPORTS_PER_SOL);
      });

      it("can propose, extend, seal and execute in the same transaction", async () => {
        const previousBalance = await balanceOf(cryptid.address());

        const superTransaction = new Transaction();

        const {
          proposeTransaction,
          transactionAccount,
          proposeSigners,
          cryptidTransactionRepresentation,
        } = await cryptid.propose(makeTransaction(), TransactionState.NotReady);
        superTransaction.add(...proposeTransaction.instructions);

        // extend the transaction with a transfer to recipient 2
        const extendTransaction = await cryptid.extend(
          transactionAccount,
          makeTransaction()
        );
        superTransaction.add(...extendTransaction.instructions);

        // seal the transaction
        const { sealTransaction, sealSigners } = await cryptid.seal(
          transactionAccount
        );
        superTransaction.add(...sealTransaction.instructions);

        // execute the transaction
        const { executeTransactions, executeSigners } = await cryptid.execute(
          transactionAccount,
          cryptidTransactionRepresentation
        );
        superTransaction.add(...executeTransactions[0].instructions);

        await cryptid.send(superTransaction, [
          ...proposeSigners,
          ...sealSigners,
          ...executeSigners,
        ]);

        const currentBalance = await balanceOf(cryptid.address());

        // Both txes have been executed
        expect(previousBalance - currentBalance).to.equal(2 * LAMPORTS_PER_SOL);
      });

      it("cannot execute a transaction until sealed", async () => {
        // send the propose tx (in unready state)
        const { proposeTransaction, transactionAccount, proposeSigners } =
          await cryptid.propose(makeTransaction(), TransactionState.NotReady);

        await cryptid.send(proposeTransaction, proposeSigners);

        // send the execute tx
        const { executeTransactions } = await cryptid.execute(
          transactionAccount
        );
        const shouldFail = cryptid.send(executeTransactions[0]);

        return expect(shouldFail).to.be.rejected;
      });

      it("can extend with a different authority to the one used to propose", async () => {
        // add a second authority to the DID
        const { authority: secondAuthority } = createTestContext();
        await fund(secondAuthority.publicKey, LAMPORTS_PER_SOL);
        await initializeDIDIfNecessary();
        await addKeyToDID(authority, secondAuthority.publicKey);

        // create a cryptid client using the second authority as a signer
        const firstAuthorityCryptid = cryptid;
        const secondAuthorityCryptid = await CryptidBuilder.buildFromDID(
          did,
          secondAuthority,
          {
            connection: provider.connection,
            accountIndex: cryptid.details.index,
          }
        );

        const previousBalance = await balanceOf(cryptid.address());

        // send the propose tx (in unready state) and sign with original authority
        const { proposeTransaction, transactionAccount, proposeSigners } =
          await cryptid.propose(makeTransaction(), TransactionState.NotReady);
        await firstAuthorityCryptid.send(proposeTransaction, proposeSigners);

        // extend the transaction with the second authority
        const extendTx = await secondAuthorityCryptid.extend(
          transactionAccount,
          makeTransaction()
        );
        await secondAuthorityCryptid.send(extendTx, []);

        // seal the transaction (with the first authority)
        const { sealTransaction, sealSigners } =
          await firstAuthorityCryptid.seal(transactionAccount);
        await firstAuthorityCryptid.send(sealTransaction, sealSigners);

        // send the execute tx (with the second authority)
        const { executeTransactions } = await secondAuthorityCryptid.execute(
          transactionAccount
        );
        await secondAuthorityCryptid.send(executeTransactions[0]);

        const currentBalance = await balanceOf(cryptid.address());
        // Both txes have been executed
        expect(previousBalance - currentBalance).to.equal(2 * LAMPORTS_PER_SOL);
      });
    });
  });
});
