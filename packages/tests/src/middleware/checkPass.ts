import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  cryptidTransferInstruction,
  makeTransfer,
  toAccountMeta,
} from "../util/cryptid";
import { addKeyToDID, initializeDIDAccount } from "../util/did";
import {
  balanceOf,
  createTestContext,
  fund,
  Wallet,
} from "../util/anchorUtils";
import { DID_SOL_PREFIX, DID_SOL_PROGRAM } from "@identity.com/sol-did-client";
import { GATEWAY_PROGRAM } from "../util/constants";
import {
  addGatekeeper,
  getExpireFeatureAddress,
  sendGatewayTransaction,
  setExpireFeature,
} from "../util/gatekeeperUtils";
import { GatekeeperService } from "@identity.com/solana-gatekeeper-lib";
import { getGatewayTokenAddressForOwnerAndGatekeeperNetwork } from "@identity.com/solana-gateway-ts";
import { beforeEach } from "mocha";
import {
  CheckPassMiddleware,
  Cryptid,
  CRYPTID_PROGRAM,
  CryptidClient,
  InstructionData,
  TransactionState,
} from "@identity.com/cryptid";
import { deriveMiddlewareAccountAddress } from "@identity.com/cryptid-middleware-check-pass";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("Middleware: checkPass", () => {
  const {
    program,
    provider,
    authority,
    keypair,
    middleware: { checkPass: checkPassMiddlewareProgram },
  } = createTestContext();

  const gatekeeper = Keypair.generate();
  let gatekeeperNetwork: Keypair;
  let gatekeeperService: GatekeeperService;
  // The address of the expire-on-use feature for the gatekeeper network,
  // if it exists.
  let expireFeatureAccount: PublicKey;

  let didAccount: PublicKey;
  let cryptidIndex = 0; // The index of the cryptid account owned by that DID - increment when creating a new account
  let cryptid: CryptidClient;

  let middlewareAccount: PublicKey;

  const recipient = Keypair.generate();
  const transferInstructionData = cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL

  const createGatewayToken = (owner: PublicKey) =>
    sendGatewayTransaction(() => gatekeeperService.issue(owner));

  const revokeGatewayToken = (gatewayToken: PublicKey) =>
    sendGatewayTransaction(() => gatekeeperService.revoke(gatewayToken));

  const getGatewayToken = (owner: PublicKey) =>
    gatekeeperService.findGatewayTokenForOwner(owner);

  const setUpMiddleware = async (
    expireGatewayTokenOnUse: boolean,
    failsafe?: PublicKey
  ) => {
    [middlewareAccount] = deriveMiddlewareAccountAddress(
      authority.publicKey,
      gatekeeperNetwork.publicKey,
      failsafe
    );

    await checkPassMiddlewareProgram.methods
      .create(
        gatekeeperNetwork.publicKey,
        expireGatewayTokenOnUse,
        failsafe || null,
        null
      )
      .accounts({
        middlewareAccount,
        authority: authority.publicKey,
      })
      .rpc();
  };

  const setUpMiddlewareWithClient = async (failsafe?: PublicKey) => {
    [middlewareAccount] = deriveMiddlewareAccountAddress(
      authority.publicKey,
      gatekeeperNetwork.publicKey,
      failsafe
    );
    const transaction = await new CheckPassMiddleware().createMiddleware({
      authority,
      connection: provider.connection,
      expirePassOnUse: false,
      keyAlias: "cold",
      opts: {},
      gatekeeperNetwork: gatekeeperNetwork.publicKey,
      failsafe,
    });

    await provider.sendAndConfirm(transaction, [keypair]);
  };

  const setUpCryptidClient = async (signer: Wallet | Keypair = authority) => {
    const middleware = [
      {
        programId: checkPassMiddlewareProgram.programId,
        address: middlewareAccount,
      },
    ];

    cryptid = await Cryptid.createFromDID(
      DID_SOL_PREFIX + ":" + authority.publicKey,
      signer,
      middleware,
      { connection: provider.connection, accountIndex: ++cryptidIndex }
    );

    await fund(cryptid.address(), 20 * LAMPORTS_PER_SOL);
  };

  const makeTransaction = () =>
    makeTransfer(cryptid.address(), recipient.publicKey);

  const propose = async (
    transactionAccount: Keypair,
    instruction: InstructionData = transferInstructionData
  ) =>
    program.methods
      .proposeTransaction(
        [], // no controller chain,
        cryptid.details.bump,
        cryptid.details.index,
        cryptid.details.didAccountBump,
        TransactionState.toBorsh(TransactionState.Ready),
        [instruction],
        2
      )
      .accounts({
        cryptidAccount: cryptid.address(),
        didProgram: DID_SOL_PROGRAM,
        did: didAccount,
        authority: authority.publicKey,
        transactionAccount: transactionAccount.publicKey,
      })
      .remainingAccounts([
        toAccountMeta(recipient.publicKey, true, false),
        toAccountMeta(SystemProgram.programId),
      ])
      .signers([transactionAccount])
      .rpc();

  const execute = (transactionAccount: Keypair) =>
    // execute the Cryptid transaction
    program.methods
      .executeTransaction(
        Buffer.from([]), // no controller chain
        cryptid.details.bump,
        cryptid.details.index,
        cryptid.details.didAccountBump,
        0
      )
      .accounts({
        cryptidAccount: cryptid.address(),
        didProgram: DID_SOL_PROGRAM,
        did: didAccount,
        authority: authority.publicKey,
        destination: authority.publicKey,
        transactionAccount: transactionAccount.publicKey,
      })
      .remainingAccounts([
        toAccountMeta(recipient.publicKey, true, false),
        toAccountMeta(SystemProgram.programId),
      ])
      .rpc();

  const checkPass = (transactionAccount: Keypair, gatewayToken: PublicKey) =>
    // execute the check recipient middleware, to ensure that the correct recipient is used in the tx
    checkPassMiddlewareProgram.methods
      .executeMiddleware()
      .accounts({
        middlewareAccount,
        transactionAccount: transactionAccount.publicKey,
        did: didAccount,
        authority: authority.publicKey,
        expireFeatureAccount,
        gatewayToken,
        cryptidProgram: CRYPTID_PROGRAM,
        gatewayProgram: GATEWAY_PROGRAM,
      })
      .rpc();

  before("Set up DID account", async () => {
    await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
    [didAccount] = await initializeDIDAccount(authority);
  });

  before("Fund the gatekeeper", () => fund(gatekeeper.publicKey));

  // Create a new gatekeeper network each test to allow multiple gateway tokens to be issued
  beforeEach("Set up a gatekeeper network and gatekeeper", async () => {
    gatekeeperNetwork = Keypair.generate();
    await fund(gatekeeperNetwork.publicKey);

    // the expire feature account does not exist yet, but derive its address anyway
    // as all tests need to pass one in
    expireFeatureAccount = await getExpireFeatureAddress(
      gatekeeperNetwork.publicKey
    );

    gatekeeperService = await addGatekeeper(
      provider,
      gatekeeperNetwork,
      gatekeeper
    );
  });

  context("with the cryptid client", () => {
    beforeEach("Set up middleware PDA", async () => {
      [middlewareAccount] = deriveMiddlewareAccountAddress(
        authority.publicKey,
        gatekeeperNetwork.publicKey
      );
      const transaction = await new CheckPassMiddleware().createMiddleware({
        authority,
        connection: provider.connection,
        expirePassOnUse: false,
        keyAlias: "cold",
        opts: {},
        gatekeeperNetwork: gatekeeperNetwork.publicKey,
      });

      await provider.sendAndConfirm(transaction, [keypair]);
    });

    beforeEach("Set up Cryptid Account with middleware", setUpCryptidClient);

    it("blocks a transfer with no gateway token", async () => {
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

      // TODO expose the error message
      return expect(shouldFail).to.be.rejected;
    });

    it("allows a transfer if the authority has a valid gateway token", async () => {
      const previousBalance = await balanceOf(cryptid.address());

      // issue a gateway token to the authority
      await createGatewayToken(authority.publicKey);

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

    it("transfers in a single transaction", async () => {
      const previousBalance = await balanceOf(cryptid.address());

      // issue a gateway token to the authority
      await createGatewayToken(authority.publicKey);

      const { executeTransactions, executeSigners } =
        await cryptid.proposeAndExecute(makeTransaction(), true);
      expect(executeTransactions.length).to.equal(1);
      await cryptid.send(executeTransactions[0], executeSigners);

      const currentBalance = await balanceOf(cryptid.address());
      expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Now the tx has been executed
    });
  });

  context("with a failsafe key", () => {
    let failsafe: Keypair;

    beforeEach("Set up middleware PDA with a failsafe", async () => {
      failsafe = Keypair.generate();
      await setUpMiddlewareWithClient(failsafe.publicKey);
      await fund(failsafe.publicKey);
    });

    it("allows a transfer if signed by the failsafe key", async () => {
      // add the failsafe to the did, and set up a cryptid client
      await addKeyToDID(authority, failsafe.publicKey);
      await setUpCryptidClient(failsafe);

      const previousBalance = await balanceOf(cryptid.address());

      // no gateway token exists for the authority
      const { executeTransactions, executeSigners } =
        await cryptid.proposeAndExecute(makeTransaction(), true);
      expect(executeTransactions.length).to.equal(1);

      await cryptid.send(executeTransactions[0], executeSigners);

      const currentBalance = await balanceOf(cryptid.address());
      expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Now the tx has been executed
    });

    it("fails a transfer if the failsafe key is not on the DID", async () => {
      // set up a new cryptid account with the authority
      await setUpCryptidClient();
      // attempt to use it as the failsafe
      cryptid = Cryptid.build(cryptid.details, failsafe, {
        connection: provider.connection,
      });

      // no gateway token exists for the authority
      const { executeTransactions, executeSigners } =
        await cryptid.proposeAndExecute(makeTransaction(), true);
      expect(executeTransactions.length).to.equal(1);

      const shouldFail = cryptid.send(executeTransactions[0], executeSigners);

      // TODO expose the error message
      return expect(shouldFail).to.be.rejected;
    });
  });

  context("with a non-expiring gateway token", () => {
    beforeEach("Set up middleware PDA", () => setUpMiddleware(false));
    beforeEach("Set up Cryptid Account with middleware", setUpCryptidClient);

    it("blocks a transfer with no gateway token", async () => {
      const transactionAccount = Keypair.generate();
      // get the gateway token address but don't actually create the gateway token
      const missingGatewayToken =
        await getGatewayTokenAddressForOwnerAndGatekeeperNetwork(
          authority.publicKey,
          gatekeeperNetwork.publicKey
        );

      // propose the Cryptid transaction
      await propose(transactionAccount);

      // fails to pass through the middleware
      const shouldFail = checkPass(transactionAccount, missingGatewayToken);

      return expect(shouldFail).to.be.rejectedWith("Error Code: InvalidPass");
    });

    it("blocks a transfer if the gateway token is present but invalid", async () => {
      const transactionAccount = Keypair.generate();

      // create the token but revoke it
      const gatewayToken = await createGatewayToken(authority.publicKey);
      await revokeGatewayToken(gatewayToken.publicKey);

      // propose the Cryptid transaction
      await propose(transactionAccount);

      // fails to pass through the middleware
      const shouldFail = checkPass(transactionAccount, gatewayToken.publicKey);

      return expect(shouldFail).to.be.rejectedWith("Error Code: InvalidPass");
    });

    it("blocks a transfer if the gateway token is for the wrong gatekeeper network", async () => {
      const transactionAccount = Keypair.generate();

      // create a gatekeeper network, add the gatekeeper to it and issue a token from it.
      const wrongGatekeeperNetwork = Keypair.generate();
      await fund(wrongGatekeeperNetwork.publicKey);
      const wrongGatekeeperService = await addGatekeeper(
        provider,
        wrongGatekeeperNetwork,
        gatekeeper
      );
      const gatewayToken = await sendGatewayTransaction(() =>
        wrongGatekeeperService.issue(authority.publicKey)
      );

      // propose the Cryptid transaction
      await propose(transactionAccount);

      // fails to pass through the middleware
      const shouldFail = checkPass(transactionAccount, gatewayToken.publicKey);

      return expect(shouldFail).to.be.rejectedWith("Error Code: InvalidPass");
    });

    it("allows a transfer if the authority has a valid gateway token", async () => {
      const previousBalance = await balanceOf(cryptid.address());

      const transactionAccount = Keypair.generate();

      // issue a gateway token to the authority
      const gatewayToken = await createGatewayToken(authority.publicKey);

      // propose the Cryptid transaction
      await propose(transactionAccount);

      // pass through the middleware
      await checkPass(transactionAccount, gatewayToken.publicKey);

      // execute the Cryptid transaction
      await execute(transactionAccount);

      const currentBalance = await balanceOf(cryptid.address());
      expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Now the tx has been executed
    });

    it("allows a transfer if the DID account has a valid gateway token", async () => {
      // the difference between this one and the previous one is that it shows that
      // the gateway token can be associated with the DID account itself rather than the authority wallet
      const previousBalance = await balanceOf(cryptid.address());

      const transactionAccount = Keypair.generate();

      // issue a gateway token to the authority
      const gatewayToken = await createGatewayToken(didAccount);

      // propose the Cryptid transaction
      await propose(transactionAccount);

      // pass through the middleware
      await checkPass(transactionAccount, gatewayToken.publicKey);

      // execute the Cryptid transaction
      await execute(transactionAccount);

      const currentBalance = await balanceOf(cryptid.address());
      expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Now the tx has been executed
    });
  });

  context("with a gateway token that expires", () => {
    beforeEach(() => setExpireFeature(provider, gatekeeperNetwork));
    beforeEach("Set up middleware PDA", () => setUpMiddleware(true));
    beforeEach(
      "Set up generative Cryptid Account with middleware",
      setUpCryptidClient
    );

    it("expires a gateway token after use", async () => {
      const transactionAccount = Keypair.generate();

      // issue a gateway token to the authority
      const gatewayToken = await createGatewayToken(authority.publicKey);

      // propose the Cryptid transaction
      await propose(transactionAccount);

      // pass through the middleware
      await checkPass(transactionAccount, gatewayToken.publicKey);

      // execute the Cryptid transaction
      await execute(transactionAccount);

      // the pass has now been invalidated
      const updatedGatewayToken = await getGatewayToken(authority.publicKey);
      expect(updatedGatewayToken?.isValid()).to.be.false;
    });
  });
});
