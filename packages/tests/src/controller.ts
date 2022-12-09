import {
  DID_SOL_PREFIX,
  DidSolIdentifier,
  DidSolService,
} from "@identity.com/sol-did-client";
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
import { CLUSTER } from "./util/constants";

chai.use(chaiAsPromised);
const { expect } = chai;

didTestCases.forEach(({ type, beforeFn }) => {
  describe(`controller (${type})`, () => {
    const { authority, provider } = createTestContext();
    const controlled = Keypair.generate();

    let controlledDidAccount: PublicKey;
    let cryptidAccount: PublicKey;

    let cryptid: CryptidClient;

    const controllerDid = DID_SOL_PREFIX + ":" + authority.publicKey;
    const controlledDid = DID_SOL_PREFIX + ":" + controlled.publicKey;

    const makeTransaction = (recipient: PublicKey) =>
      makeTransfer(cryptidAccount, recipient);

    before("Set up controllerDID account", async () => {
      await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
      await beforeFn(authority);
    });

    before("Set up DID accounts", async () => {
      await fund(controlled.publicKey, 10 * LAMPORTS_PER_SOL);
      const controlledWallet = toWallet(controlled);
      controlledDidAccount = await initializeDIDAccount(controlledWallet);

      await setControllersOnDid(controlledWallet, [controllerDid]);

      const did = DidSolIdentifier.create(controlledWallet.publicKey, CLUSTER);

      // TODO remove once the tests pass
      const didSolService = DidSolService.build(did, {
        wallet: controlledWallet,
      });
      const doc = await didSolService.resolve();
      console.log(doc);
    });

    before("Set up generative Cryptid Account for controlled", async () => {
      [cryptidAccount] = deriveCryptidAccountAddress(controlledDidAccount);

      cryptid = await Cryptid.buildFromDID(controlledDid, authority, {
        connection: provider.connection,
      }).controlWith(controllerDid);

      await fund(cryptidAccount, 20 * LAMPORTS_PER_SOL);
    });

    it("can transfer from the controlled DID, signed by an authority on the controller DID", async () => {
      const recipient = Keypair.generate();

      console.log({
        authority: authority.publicKey.toBase58(),
        recipient: recipient.publicKey.toBase58(),
        controllerDid,
        controlledDid,
        cryptidAccount: cryptidAccount.toBase58(),
      });

      const previousBalance = await balanceOf(cryptidAccount);

      const signedTransaction = await cryptid.directExecute(
        makeTransaction(recipient.publicKey)
      );
      await cryptid.send(signedTransaction);

      const currentBalance = await balanceOf(cryptidAccount);

      expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Should have lost 1 SOL
    });
  });
});
