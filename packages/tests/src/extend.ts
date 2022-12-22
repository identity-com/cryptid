import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  cryptidTestCases,
  cryptidTransferInstruction,
  makeTransfer,
  toAccountMeta,
} from "./util/cryptid";
import { didTestCases } from "./util/did";
import { fund, createTestContext, balanceOf } from "./util/anchorUtils";
import { DID_SOL_PREFIX, DID_SOL_PROGRAM } from "@identity.com/sol-did-client";
import { web3 } from "@project-serum/anchor";
import {
  CryptidClient,
  InstructionData,
  TransactionAccountMeta,
  TransactionState,
} from "@identity.com/cryptid";

chai.use(chaiAsPromised);
const { expect } = chai;

didTestCases.forEach(({ didType, getDidAccount }) => {
  cryptidTestCases.forEach(({ cryptidType, getCryptidClient }) => {
    describe(`extend (${didType} DID, ${cryptidType} Cryptid)`, () => {
      const { program, provider, authority, keypair } = createTestContext();
      let didAccount: PublicKey;
      const did = DID_SOL_PREFIX + ":" + authority.publicKey;

      const recipient = Keypair.generate();

      let cryptid: CryptidClient;

      // use this when testing directly against anchor
      const transferInstructionData =
        cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL
      // use this when testing against the cryptid client
      const makeTransaction = () =>
        makeTransfer(cryptid.address(), recipient.publicKey);

      before(`Set up ${didType} DID account`, async () => {
        await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
        [didAccount] = await getDidAccount(authority);
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
        const sealTx = await cryptid.seal(transactionAccount);
        await cryptid.send(sealTx, []);

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
        const sealTx = await cryptid.seal(transactionAccount);
        await cryptid.send(sealTx, []);

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
      /*
      it("can extend in the same transaction", async () => {
        const previousBalance = await balanceOf(cryptid.address());

        const { executeTransactions, executeSigners } =
          await cryptid.proposeAndExecute(makeTransaction(), true);
        await cryptid.send(executeTransactions[0], executeSigners);

        const currentBalance = await balanceOf(cryptid.address());
        expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Now the tx has been executed
      });

      it("cannot execute a transaction until sealed", async () => {
        const previousBalance = await balanceOf(cryptid.address());

        const transactionAccount = Keypair.generate();

        // Propose & execute once
        await propose(transactionAccount);
        await execute(transactionAccount);

        // Propose & execute twice
        await propose(transactionAccount);
        await execute(transactionAccount);

        const currentBalance = await balanceOf(cryptid.address());

        // The tx has been executed twice
        // Note - this is not a double-spend, as the tx has to be proposed twice
        expect(previousBalance - currentBalance).to.equal(2 * LAMPORTS_PER_SOL);
      });
 */
    });
  });
});
