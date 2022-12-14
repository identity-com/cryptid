import { DID_SOL_PREFIX } from "@identity.com/sol-did-client";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { deriveCryptidAccountAddress, makeTransfer } from "./util/cryptid";
import {
  didTestCases,
  initializeDIDAccount,
  setControllersOnDid,
} from "./util/did";
import { balanceOf, createTestContext, fund } from "./util/anchorUtils";
import { Cryptid, CryptidClient } from "@identity.com/cryptid";
import { toWallet } from "@identity.com/cryptid-core/dist/lib/crypto";

chai.use(chaiAsPromised);
const { expect } = chai;

didTestCases.forEach(({ didType, getDidAccount }) => {
  describe(`controller (${didType})`, () => {
    const { authority: controllerAuthority, provider } = createTestContext();
    const controlled = Keypair.generate();

    let controlledDidAccount: PublicKey;
    let cryptidAccount: PublicKey;

    let cryptid: CryptidClient;

    const controllerDid = DID_SOL_PREFIX + ":" + controllerAuthority.publicKey;
    const controlledDid = DID_SOL_PREFIX + ":" + controlled.publicKey;

    const makeTransaction = (recipient: PublicKey) =>
      makeTransfer(cryptidAccount, recipient);

    before("Set up controllerDID account", async () => {
      await fund(controllerAuthority.publicKey, 10 * LAMPORTS_PER_SOL);
      await getDidAccount(controllerAuthority);
    });

    before("Set up DID accounts", async () => {
      await fund(controlled.publicKey, 10 * LAMPORTS_PER_SOL);
      const controlledWallet = toWallet(controlled);
      [controlledDidAccount] = await initializeDIDAccount(controlledWallet);

      await setControllersOnDid(controlledWallet, [controllerDid]);
    });

    before("Set up generative Cryptid Account for controlled", async () => {
      [cryptidAccount] = deriveCryptidAccountAddress(controlledDidAccount);

      cryptid = await Cryptid.buildFromDID(controlledDid, controllerAuthority, {
        connection: provider.connection,
      }).controlWith(controllerDid);

      await fund(cryptidAccount, 20 * LAMPORTS_PER_SOL);
    });

    it("has the same address as a non-controlled cryptid account", async () => {
      expect(cryptid.address().toBase58()).to.equal(cryptidAccount.toBase58());
    });

    it("can transfer from the controlled DID, signed by an authority on the controller DID", async () => {
      const recipient = Keypair.generate();
      const previousBalance = await balanceOf(cryptidAccount);

      const signedTransaction = await cryptid.directExecute(
        makeTransaction(recipient.publicKey)
      );
      await cryptid.send(signedTransaction);

      const currentBalance = await balanceOf(cryptidAccount);

      expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Should have lost 1 SOL
    });

    it("cannot transfer if signed by a non-controller", async () => {
      const notControlled = Keypair.generate();
      const notControlledDid = DID_SOL_PREFIX + ":" + notControlled.publicKey;

      const recipient = Keypair.generate();

      const nonControllerCryptid = await Cryptid.buildFromDID(
        notControlledDid,
        controllerAuthority,
        {
          connection: provider.connection,
        }
      ).controlWith(controllerDid);

      const signedTransaction = await nonControllerCryptid.directExecute(
        makeTransfer(nonControllerCryptid.address(), recipient.publicKey)
      );
      const shouldFail = nonControllerCryptid.send(signedTransaction);

      return expect(shouldFail).to.be.rejectedWith(/KeyMustBeSigner/);
    });

    it("can handle a chain of DIDs", async () => {
      // set up a third DID, controlled by controlledDid
      // so the did chain is:
      // controllerDid -> controlledDid -> finalControlledDid
      // The transaction will be signed by an authority on controllerDid

      const finalControlled = Keypair.generate();
      const finalControlledDid =
        DID_SOL_PREFIX + ":" + finalControlled.publicKey;
      const finalControlledWallet = toWallet(finalControlled);

      await fund(finalControlled.publicKey, 10 * LAMPORTS_PER_SOL);
      await initializeDIDAccount(finalControlledWallet);
      await setControllersOnDid(finalControlledWallet, [controlledDid]);

      // create a cryptid client for this final controlled DID
      cryptid = await Cryptid.buildFromDID(
        finalControlledDid,
        controllerAuthority,
        {
          connection: provider.connection,
        }
        // define the entire chain of DIDs between controlled and controller
      )
        .controlWith(controlledDid)
        .controlWith(controllerDid);

      await fund(cryptid.address(), 20 * LAMPORTS_PER_SOL);

      const recipient = Keypair.generate();
      const previousBalance = await balanceOf(cryptid.address());

      const signedTransaction = await cryptid.directExecute(
        makeTransfer(cryptid.address(), recipient.publicKey)
      );
      await cryptid.send(signedTransaction);

      const currentBalance = await balanceOf(cryptid.address());

      expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Should have lost 1 SOL
    });
  });
});
