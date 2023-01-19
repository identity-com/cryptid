import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { cryptidTestCases, makeTransfer } from "./util/cryptid";
import { didTestCases } from "./util/did";
import { createTestContext, fund } from "./util/anchorUtils";
import { DID_SOL_PREFIX } from "@identity.com/sol-did-client";
import { CryptidClient, TransactionState } from "@identity.com/cryptid";

chai.use(chaiAsPromised);
const { expect } = chai;

didTestCases.forEach(({ didType, getDidAccount }) => {
  cryptidTestCases.forEach(({ cryptidType, getCryptidClient }) => {
    describe(`close (${didType} DID, ${cryptidType} Cryptid)`, () => {
      const { provider, authority } = createTestContext();
      const did = DID_SOL_PREFIX + ":" + authority.publicKey;

      const recipient = Keypair.generate();

      let cryptid: CryptidClient;

      const makeTransaction = () =>
        makeTransfer(cryptid.address(), recipient.publicKey);

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

      it("can close a transaction in NotReady State", async () => {
        // send the close tx
        const { proposeTransaction, transactionAccount, proposeSigners } =
          await cryptid.propose(makeTransaction(), TransactionState.NotReady);

        await cryptid.send(proposeTransaction, proposeSigners);

        // close the transaction
        const { transactions, signers } = await cryptid.close(
          transactionAccount
        );
        await cryptid.send(transactions[0], signers);

        // Check that Account was closed
        const transactionAccountInfo = await provider.connection.getAccountInfo(
          transactionAccount
        );
        expect(transactionAccountInfo).to.be.null;
      });

      it("can close a transaction in Ready State", async () => {
        // send the close tx
        const { proposeTransaction, transactionAccount, proposeSigners } =
          await cryptid.propose(makeTransaction(), TransactionState.Ready);

        await cryptid.send(proposeTransaction, proposeSigners);

        // close the transaction
        const { transactions, signers } = await cryptid.close(
          transactionAccount
        );
        await cryptid.send(transactions[0], signers);

        // Check that Account was closed
        const transactionAccountInfo = await provider.connection.getAccountInfo(
          transactionAccount
        );
        expect(transactionAccountInfo).to.be.null;
      });
    });
  });
});
