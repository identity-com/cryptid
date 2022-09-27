// import {
//   Keypair,
//   LAMPORTS_PER_SOL,
//   PublicKey,
//   SystemProgram,
// } from "@solana/web3.js";
// import chai from "chai";
// import chaiAsPromised from "chai-as-promised";
// import {
//   cryptidTransferInstruction,
//   deriveCheckPassMiddlewareAccountAddress,
//   toAccountMeta,
//   createCryptidAccount,
//   makeTransfer,
//   deriveTimeDelayTransactionStateMiddlewareAccountAddress,
// } from "../util/cryptid";
// import { addKeyToDID, initializeDIDAccount } from "../util/did";
// import {
//   fund,
//   createTestContext,
//   balanceOf,
//   Wallet,
// } from "../util/anchorUtils";
// import { DID_SOL_PREFIX } from "@identity.com/sol-did-client";
// import {
//   addGatekeeper,
//   getExpireFeatureAddress,
//   sendGatewayTransaction,
// } from "../util/gatekeeperUtils";
// import { GatekeeperService } from "@identity.com/solana-gatekeeper-lib";
// import { beforeEach } from "mocha";
// import {
//   CRYPTID_PROGRAM,
//   CryptidClient,
//   InstructionData,
//   Cryptid,
//   CheckPassMiddleware,
// } from "@identity.com/cryptid";
//
// chai.use(chaiAsPromised);
// const { expect } = chai;
//
// describe("Middleware chaining", () => {
//   const {
//     program,
//     provider,
//     authority,
//     keypair,
//     middleware: {
//       checkPass: checkPassMiddlewareProgram,
//       timeDelay: timeDelayMiddlewareProgram,
//     },
//   } = createTestContext();
//
//   const gatekeeper = Keypair.generate();
//   let gatekeeperNetwork: Keypair;
//   let gatekeeperService: GatekeeperService;
//   // The address of the expire-on-use feature for the gatekeeper network,
//   // if it exists.
//   let expireFeatureAccount: PublicKey;
//
//   let didAccount: PublicKey;
//   let cryptidAccount: PublicKey;
//   let cryptidBump: number;
//   let cryptidIndex = 0; // The index of the cryptid account owned by that DID - increment when creating a new account
//   let cryptid: CryptidClient;
//
//   let checkPassMiddlewareAccount: PublicKey;
//   let checkPassMiddlewareBump: number;
//
//   let timeDelayMiddlewareAccount: PublicKey;
//   let timeDelayMiddlewareBump: number;
//
//   const recipient = Keypair.generate();
//   const transferInstructionData = cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL
//
//   const createGatewayToken = (owner: PublicKey) =>
//       sendGatewayTransaction(() => gatekeeperService.issue(owner));
//
//   const revokeGatewayToken = (gatewayToken: PublicKey) =>
//       sendGatewayTransaction(() => gatekeeperService.revoke(gatewayToken));
//
//   const getGatewayToken = (owner: PublicKey) =>
//       gatekeeperService.findGatewayTokenForOwner(owner);
//
//   const setUpCheckPassMiddleware = async () => {
//     [checkPassMiddlewareAccount, checkPassMiddlewareBump] =
//         deriveCheckPassMiddlewareAccountAddress(
//             authority.publicKey,
//             gatekeeperNetwork.publicKey,
//             null,
//             null
//         );
//     const transaction = await new CheckPassMiddleware().createMiddleware({
//       authority,
//       connection: provider.connection,
//       expirePassOnUse: false,
//       keyAlias: "cold",
//       opts: {},
//       gatekeeperNetwork: gatekeeperNetwork.publicKey,
//     });
//
//     await provider.sendAndConfirm(transaction, [keypair]);
//   };
//
//   const setUpTimeDelayMiddleware = async () => {
//     [timeDelayMiddlewareAccount, timeDelayMiddlewareBump] =
//         deriveTimeDelayTransactionStateMiddlewareAccountAddress(
//             authority.publicKey
//         );
//     const transaction = await new TimeDelayMiddleware().createMiddleware({
//       authority,
//       connection: provider.connection,
//       expirePassOnUse: false,
//       keyAlias: "cold",
//       opts: {},
//       gatekeeperNetwork: gatekeeperNetwork.publicKey,
//     });
//
//     await provider.sendAndConfirm(transaction, [keypair]);
//   };
//
//   const setUpCryptidClient = async (signer: Wallet | Keypair = authority) => {
//     const middleware = [
//       {
//         programId: checkPassMiddlewareProgram.programId,
//         address: checkPassMiddlewareAccount,
//       },
//       {
//         programId: timeDelayMiddlewareProgram.programId,
//         address: checkPassMiddlewareAccount,
//       },
//     ];
//
//     cryptid = await Cryptid.createFromDID(
//         DID_SOL_PREFIX + ":" + authority.publicKey,
//         signer,
//         middleware,
//         { connection: provider.connection, accountIndex: ++cryptidIndex }
//     );
//
//     await fund(cryptid.address(), 20 * LAMPORTS_PER_SOL);
//   };
//
//   const makeTransaction = () =>
//       makeTransfer(cryptid.address(), recipient.publicKey);
//
//   before("Set up DID account", async () => {
//     await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
//     didAccount = await initializeDIDAccount(authority);
//   });
//
//   before("Fund the gatekeeper", () => fund(gatekeeper.publicKey));
//
//   // Create a new gatekeeper network each test to allow multiple gateway tokens to be issued
//   beforeEach("Set up a gatekeeper network and gatekeeper", async () => {
//     gatekeeperNetwork = Keypair.generate();
//     await fund(gatekeeperNetwork.publicKey);
//
//     // the expire feature account does not exist yet, but derive its address anyway
//     // as all tests need to pass one in
//     expireFeatureAccount = await getExpireFeatureAddress(
//         gatekeeperNetwork.publicKey
//     );
//
//     gatekeeperService = await addGatekeeper(
//         provider,
//         gatekeeperNetwork,
//         gatekeeper
//     );
//   });
//
//   beforeEach("Set up middleware PDA", async () => {
//     [checkPassMiddlewareAccount, checkPassMiddlewareBump] =
//         deriveCheckPassMiddlewareAccountAddress(
//             authority.publicKey,
//             gatekeeperNetwork.publicKey
//         );
//     const transaction = await new CheckPassMiddleware().createMiddleware({
//       authority,
//       connection: provider.connection,
//       expirePassOnUse: false,
//       keyAlias: "cold",
//       opts: {},
//       gatekeeperNetwork: gatekeeperNetwork.publicKey,
//     });
//
//     await provider.sendAndConfirm(transaction, [keypair]);
//   });
//
//   beforeEach("Set up Cryptid Account with middleware", setUpCryptidClient);
//
//   it("blocks a transfer with no gateway token", async () => {
//     // no gateway token exists for the authority
//
//     // send the propose tx
//     const { proposeTransaction, transactionAccountAddress } =
//         await cryptid.propose(makeTransaction());
//     await cryptid.send(proposeTransaction, { skipPreflight: true });
//
//     // send the execute tx, which fails to pass through the middleware
//     const [executeTransaction] = await cryptid.execute(
//         transactionAccountAddress
//     );
//     const shouldFail = cryptid.send(executeTransaction, {
//       skipPreflight: true,
//     });
//
//     // TODO expose the error message
//     return expect(shouldFail).to.be.rejected;
//   });
//
//   it("allows a transfer if the authority has a valid gateway token", async () => {
//     const previousBalance = await balanceOf(cryptid.address());
//
//     // issue a gateway token to the authority
//     await createGatewayToken(authority.publicKey);
//
//     // send the propose tx
//     const { proposeTransaction, transactionAccountAddress } =
//         await cryptid.propose(makeTransaction());
//     await cryptid.send(proposeTransaction, { skipPreflight: true });
//
//     // send the execute tx (executing the middleware)
//     const [executeTransaction] = await cryptid.execute(
//         transactionAccountAddress
//     );
//     await cryptid.send(executeTransaction, { skipPreflight: true });
//
//     const currentBalance = await balanceOf(cryptid.address());
//     expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Now the tx has been executed
//   });
//
//   it("transfers in a single transaction", async () => {
//     const previousBalance = await balanceOf(cryptid.address());
//
//     // issue a gateway token to the authority
//     await createGatewayToken(authority.publicKey);
//
//     const [bigTransaction] = await cryptid.proposeAndExecute(
//         makeTransaction(),
//         true
//     );
//     await cryptid.send(bigTransaction, { skipPreflight: true });
//
//     const currentBalance = await balanceOf(cryptid.address());
//     expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Now the tx has been executed
//   });
// });
