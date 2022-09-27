import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { makeTransfer } from "../util/cryptid";
import { initializeDIDAccount } from "../util/did";
import {
  fund,
  createTestContext,
  balanceOf,
  Wallet,
  sleep,
} from "../util/anchorUtils";
import { DID_SOL_PREFIX } from "@identity.com/sol-did-client";
import { addGatekeeper, sendGatewayTransaction } from "../util/gatekeeperUtils";
import { GatekeeperService } from "@identity.com/solana-gatekeeper-lib";
import { beforeEach } from "mocha";
import {
  CryptidClient,
  Cryptid,
  CheckPassMiddleware,
  TimeDelayMiddleware,
} from "@identity.com/cryptid";
import { deriveMiddlewareAccountAddress as deriveCheckPassMiddlewareAddress } from "@identity.com/cryptid-middleware-check-pass";
import { deriveMiddlewareAccountAddress as deriveTimeDelayMiddlewareAddress } from "@identity.com/cryptid-middleware-time-delay";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("Middleware chaining", () => {
  const {
    provider,
    authority,
    keypair,
    middleware: {
      checkPass: checkPassMiddlewareProgram,
      timeDelay: timeDelayMiddlewareProgram,
    },
  } = createTestContext();

  const TIME_DELAY_SECONDS = 5;

  const gatekeeper = Keypair.generate();
  let gatekeeperNetwork: Keypair;
  let gatekeeperService: GatekeeperService;

  let cryptidIndex = 0; // The index of the cryptid account owned by that DID - increment when creating a new account
  let cryptid: CryptidClient;

  let checkPassMiddlewareAccount: PublicKey;
  let timeDelayMiddlewareAccount: PublicKey;

  const recipient = Keypair.generate();

  const createGatewayToken = (owner: PublicKey) =>
    sendGatewayTransaction(() => gatekeeperService.issue(owner));

  const setUpCheckPassMiddleware = async () => {
    [checkPassMiddlewareAccount] = deriveCheckPassMiddlewareAddress(
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
  };

  const setUpTimeDelayMiddleware = async () => {
    [timeDelayMiddlewareAccount] = deriveTimeDelayMiddlewareAddress(
      authority.publicKey,
      TIME_DELAY_SECONDS,
      checkPassMiddlewareAccount
    );
    const transaction = await new TimeDelayMiddleware().createMiddleware({
      authority,
      connection: provider.connection,
      seconds: TIME_DELAY_SECONDS,
      previousMiddleware: checkPassMiddlewareAccount,
      opts: {},
    });

    await provider.sendAndConfirm(transaction, [keypair]);
  };

  const setUpCryptidClient = async (signer: Wallet | Keypair = authority) => {
    const middleware = [
      {
        programId: checkPassMiddlewareProgram.programId,
        address: checkPassMiddlewareAccount,
      },
      {
        programId: timeDelayMiddlewareProgram.programId,
        address: timeDelayMiddlewareAccount,
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

  before("Set up DID account", async () => {
    await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
    await initializeDIDAccount(authority);
  });

  before("Fund the gatekeeper", () => fund(gatekeeper.publicKey));

  // Create a new gatekeeper network each test to allow multiple gateway tokens to be issued
  beforeEach("Set up a gatekeeper network and gatekeeper", async () => {
    gatekeeperNetwork = Keypair.generate();
    await fund(gatekeeperNetwork.publicKey);

    gatekeeperService = await addGatekeeper(
      provider,
      gatekeeperNetwork,
      gatekeeper
    );
  });

  beforeEach("Set up middleware PDA", async () => {
    await setUpCheckPassMiddleware();
    await setUpTimeDelayMiddleware();

    console.log("Set up middleware PDA: Accounts", {
      checkPassMiddlewareAccount: checkPassMiddlewareAccount.toBase58(),
      timeDelayMiddlewareAccount: timeDelayMiddlewareAccount.toBase58(),
    });
  });

  beforeEach("Set up Cryptid Account with middleware", setUpCryptidClient);

  it("blocks a transfer with no gateway token", async () => {
    // no gateway token exists for the authority

    // send the propose tx
    const { proposeTransaction, transactionAccountAddress } =
      await cryptid.propose(makeTransaction());
    await cryptid.send(proposeTransaction, { skipPreflight: true });

    // send the execute tx, which fails to pass through the middleware
    const [executeTransaction] = await cryptid.execute(
      transactionAccountAddress
    );
    const shouldFail = cryptid.send(executeTransaction, {
      skipPreflight: true,
    });

    // TODO expose the error message
    return expect(shouldFail).to.be.rejected;
  });

  it("blocks an immediate transfer even if the authority has a valid gateway token", async () => {
    // issue a gateway token to the authority
    await createGatewayToken(authority.publicKey);

    // send the propose tx
    const { proposeTransaction, transactionAccountAddress } =
      await cryptid.propose(makeTransaction());
    await cryptid.send(proposeTransaction, { skipPreflight: true });

    // send the execute tx, which fails to pass through the middleware
    const [executeTransaction] = await cryptid.execute(
      transactionAccountAddress
    );
    const shouldFail = cryptid.send(executeTransaction, {
      skipPreflight: true,
    });

    // TODO expose the error message
    return expect(shouldFail).to.be.rejected;
  });

  it("allows a transfer if the authority has a valid gateway token and waits between propose and execute", async () => {
    const previousBalance = await balanceOf(cryptid.address());

    // issue a gateway token to the authority
    await createGatewayToken(authority.publicKey);

    // send the propose tx
    const { proposeTransaction, transactionAccountAddress } =
      await cryptid.propose(makeTransaction());
    await cryptid.send(proposeTransaction, { skipPreflight: true });

    // wait for the period required by the time-delay middleware
    await sleep((TIME_DELAY_SECONDS + 2) * 1000);

    // send the execute tx (executing the middleware)
    const [executeTransaction] = await cryptid.execute(
      transactionAccountAddress
    );
    await cryptid.send(executeTransaction, { skipPreflight: true });

    const currentBalance = await balanceOf(cryptid.address());
    expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Now the tx has been executed
  });

  it("fails if the middleware is executed out of order", async () => {
    // issue a gateway token to the authority
    await createGatewayToken(authority.publicKey);

    // send the propose tx
    const { proposeTransaction, transactionAccountAddress } =
      await cryptid.propose(makeTransaction());
    await cryptid.send(proposeTransaction, { skipPreflight: true });

    // wait for the period required by the time-delay middleware
    await sleep((TIME_DELAY_SECONDS + 2) * 1000);

    const backwardsCryptid = await Cryptid.build(
      {
        ...cryptid.details,
        middlewares: cryptid.details.middlewares.reverse(),
      },
      authority,
      { connection: provider.connection }
    );

    // send the execute tx, which fails to pass through the middleware because
    // the time-delay middleware expects the check-pass middleware to have been executed first
    const [executeTransaction] = await backwardsCryptid.execute(
      transactionAccountAddress
    );
    const shouldFail = backwardsCryptid.send(executeTransaction, {
      skipPreflight: true,
    });

    // TODO expose the error message
    return expect(shouldFail).to.be.rejected;
  });

  it.only("fails if a middleware is skipped", async () => {
    // issue a gateway token to the authority
    await createGatewayToken(authority.publicKey);

    // send the propose tx
    const { proposeTransaction, transactionAccountAddress } =
      await cryptid.propose(makeTransaction());
    await cryptid.send(proposeTransaction, { skipPreflight: true });

    // leave out the timedelay middleware and try to pass a tx with just the check-pass one
    const cryptidWithoutTimeDelay = await Cryptid.build(
      {
        ...cryptid.details,
        middlewares: [cryptid.details.middlewares[0]],
      },
      authority,
      { connection: provider.connection }
    );

    // send the execute tx, which fails to pass through the middleware because
    // the time-delay middleware expects the check-pass middleware to have been executed first
    const [executeTransaction] = await cryptidWithoutTimeDelay.execute(
      transactionAccountAddress
    );
    const shouldFail = cryptidWithoutTimeDelay.send(executeTransaction, {
      skipPreflight: true,
    });

    // TODO expose the error message
    return expect(shouldFail).to.be.rejected;
  });
});
