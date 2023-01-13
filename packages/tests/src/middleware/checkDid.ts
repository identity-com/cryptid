import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { makeTransfer } from "../util/cryptid";
import {
  addEthKeyWithOwnershipToDID,
  addServiceToDID,
  initializeDIDAccount,
} from "../util/did";
import {
  balanceOf,
  createTestContext,
  fund,
  Wallet,
} from "../util/anchorUtils";
import {
  BitwiseVerificationMethodFlag,
  DidSolIdentifier,
  ExtendedCluster,
  VerificationMethodType,
} from "@identity.com/sol-did-client";
import { Cryptid, CryptidClient } from "@identity.com/cryptid";
import {
  CheckDidMiddleware,
  deriveMiddlewareAccountAddress,
} from "@identity.com/cryptid-middleware-check-did";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("Middleware: CheckDid", () => {
  const {
    provider,
    authority,
    keypair,
    middleware: { checkDid: checkDidMiddlewareProgram },
  } = createTestContext();

  const cluster: ExtendedCluster = "localnet";
  // let didAccount: PublicKey;
  let cryptidIndex = 0; // The index of the cryptid account owned by that DID - increment when creating a new account
  let cryptid: CryptidClient;

  let middlewareAccount: PublicKey;

  const recipient = Keypair.generate();

  const setUpCryptidClient = async (signer: Wallet | Keypair = authority) => {
    const middleware = [
      {
        programId: checkDidMiddlewareProgram.programId,
        address: middlewareAccount,
        isSuperuser: false,
      },
    ];

    cryptid = await Cryptid.createFromDID(
      DidSolIdentifier.create(authority.publicKey, cluster).toString(),
      signer,
      middleware,
      { connection: provider.connection, accountIndex: ++cryptidIndex }
    );

    await fund(cryptid.address(), 20 * LAMPORTS_PER_SOL);
  };

  const makeTransaction = () =>
    makeTransfer(cryptid.address(), recipient.publicKey);

  before("Set up DID account", async () => {
    await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
    await initializeDIDAccount(authority);
  });

  context("with the cryptid client and verificationMethodMatcher", () => {
    before("Set up middleware PDA", async () => {
      const params = {
        authority,
        verificationMethodMatcher: {
          filterFragment: null,
          filterFlags:
            BitwiseVerificationMethodFlag.CapabilityInvocation |
            BitwiseVerificationMethodFlag.OwnershipProof,
          filterKeyData: null,
          filterTypes: Buffer.from([
            VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020,
          ]), // VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020
        },
        serviceMatcher: {
          filterFragment: null,
          filterServiceType: "profile-pic",
          filterServiceEndpoint:
            "https://tenor.com/view/vendetta-hats-off-fat-gif-11654529",
        },
        controllerMatcher: {
          filterNativeController: null,
          filterOtherController: null,
        },
        opts: {},
        connection: provider.connection,
      };

      [middlewareAccount] = deriveMiddlewareAccountAddress(params);
      const transaction = await new CheckDidMiddleware().createMiddleware(
        params
      );

      await provider.sendAndConfirm(transaction, [keypair]);
    });

    before("Set up Cryptid Account with middleware", setUpCryptidClient);

    it("blocks a transfer with a wrong did (VerificationMethodMatcherError).", async () => {
      // no gateway token exists for the authority

      // send the propose tx
      const { proposeTransaction, transactionAccount, proposeSigners } =
        await cryptid.propose(makeTransaction());
      await cryptid.send(proposeTransaction, proposeSigners);

      // send the execute tx, which fails to pass through the middleware
      const { executeTransactions, executeSigners } = await cryptid.execute(
        transactionAccount
      );
      const shouldFail = cryptid.send(executeTransactions[0], executeSigners);

      return expect(shouldFail).to.be.rejectedWith(
        "Error Code: VerificationMethodMatcherError."
      );
    });

    it("blocks a transfer with a wrong did (ServiceMatcherError).", async () => {
      // no gateway token exists for the authority

      // Add Eth Key with Ownership flag
      await addEthKeyWithOwnershipToDID(authority);

      // send the propose tx
      const { proposeTransaction, transactionAccount, proposeSigners } =
        await cryptid.propose(makeTransaction());
      await cryptid.send(proposeTransaction, proposeSigners);

      // send the execute tx, which fails to pass through the middleware
      const { executeTransactions, executeSigners } = await cryptid.execute(
        transactionAccount
      );
      const shouldFail = cryptid.send(executeTransactions[0], executeSigners);

      return expect(shouldFail).to.be.rejectedWith(
        "Error Code: ServiceMatcherError."
      );
    });

    it("allows a transfer if the DID succeeds all matches.", async () => {
      const previousBalance = await balanceOf(cryptid.address());

      // Add Eth Key with Ownership flag
      await addServiceToDID(authority, {
        fragment: "test-service",
        serviceType: "profile-pic",
        serviceEndpoint:
          "https://tenor.com/view/vendetta-hats-off-fat-gif-11654529",
      });

      // send the propose tx
      const { proposeTransaction, transactionAccount, proposeSigners } =
        await cryptid.propose(makeTransaction());
      await cryptid.send(proposeTransaction, proposeSigners);

      // send the execute tx (executing the middleware)
      const { executeTransactions, executeSigners } = await cryptid.execute(
        transactionAccount
      );
      await cryptid.send(executeTransactions[0], executeSigners);

      const currentBalance = await balanceOf(cryptid.address());
      expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Now the tx has been executed
    });

    it("transfers in a single transaction if the DID succeeds all matches.", async () => {
      const previousBalance = await balanceOf(cryptid.address());

      const { executeTransactions, executeSigners } =
        await cryptid.proposeAndExecute(makeTransaction(), true);
      expect(executeTransactions.length).to.equal(1);
      await cryptid.send(executeTransactions[0], executeSigners);

      const currentBalance = await balanceOf(cryptid.address());
      expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Now the tx has been executed
    });
  });
});
