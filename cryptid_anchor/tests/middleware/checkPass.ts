import {Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram} from "@solana/web3.js";
import chai from 'chai';
import chaiAsPromised from "chai-as-promised";
import {
    cryptidTransferInstruction,
    deriveCryptidAccountAddressWithMiddleware,
    deriveCheckPassMiddlewareAccountAddress,
    toAccountMeta,
} from "../util/cryptid";
import {initializeDIDAccount} from "../util/did";
import {fund, createTestContext, balanceOf} from "../util/anchorUtils";
import {DID_SOL_PROGRAM} from "@identity.com/sol-did-client";
import {InstructionData} from "../util/types";
import {CRYPTID_PROGRAM} from "../util/constants";
import {addGatekeeper, sendGatewayTransaction} from "../util/gatekeeperUtils";
import {GatekeeperService} from "@identity.com/solana-gatekeeper-lib";
import {getGatewayTokenAddressForOwnerAndGatekeeperNetwork} from "@identity.com/solana-gateway-ts";

chai.use(chaiAsPromised);
const {expect} = chai;

describe("Middleware: checkPass", () => {
    const {
        program,
        provider,
        authority,
        middleware: {
            checkPass: checkPassMiddlewareProgram,
        }
    } = createTestContext();

    const gatekeeper = Keypair.generate();
    let gatekeeperNetwork;
    let gatekeeperService: GatekeeperService;

    let didAccount: PublicKey;
    let cryptidAccount: PublicKey;
    let cryptidBump: number;

    let middlewareAccount: PublicKey;
    let middlewareBump: number;

    let recipient = Keypair.generate();
    const transferInstructionData = cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL

    const createGatewayToken = (owner: PublicKey) =>
        sendGatewayTransaction(() => gatekeeperService.issue(owner))

    const revokeGatewayToken = (gatewayToken: PublicKey) =>
        sendGatewayTransaction(() => gatekeeperService.revoke(gatewayToken))


    const propose = async (transactionAccount: Keypair, instruction: InstructionData = transferInstructionData) =>
        program.methods.proposeTransaction(
            [instruction],
            2,
        ).accounts({
                cryptidAccount,
                owner: didAccount,
                authority: authority.publicKey,
                transactionAccount: transactionAccount.publicKey
            }
        ).remainingAccounts([
                toAccountMeta(recipient.publicKey, true, false),
                toAccountMeta(SystemProgram.programId)
            ]
        ).signers(
            [transactionAccount]
        ).rpc({skipPreflight: true}); // skip preflight so we see validator logs on error

    const execute = (transactionAccount: Keypair) =>
        // execute the Cryptid transaction
        program.methods.executeTransaction(
            Buffer.from([]),  // no controller chain
            middlewareAccount,
            cryptidBump,
            0
        ).accounts({
                cryptidAccount,
                didProgram: DID_SOL_PROGRAM,
                did: didAccount,
                signer: authority.publicKey,
                destination: authority.publicKey,
                transactionAccount: transactionAccount.publicKey
            }
        ).remainingAccounts([
            toAccountMeta(recipient.publicKey, true, false),
            toAccountMeta(SystemProgram.programId)
        ]).rpc({skipPreflight: true}); // skip preflight so we see validator logs on error

    const checkPass = (transactionAccount: Keypair, gatewayToken: PublicKey) =>
        // execute the check recipient middleware, to ensure that the correct recipient is used in the tx
        checkPassMiddlewareProgram.methods.executeMiddleware().accounts({
                middlewareAccount,
                transactionAccount: transactionAccount.publicKey,
                owner: didAccount,
                gatewayToken,
                cryptidProgram: CRYPTID_PROGRAM
            }
        ).rpc({skipPreflight: true}); // skip preflight so we see validator logs on error

    before('Set up DID account', async () => {
        await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
        didAccount = await initializeDIDAccount(authority);
    })

    before('Fund the gatekeeper', () => fund(gatekeeper.publicKey));

    // Create a new gatekeeper network each test to allow multiple gateway tokens to be issued
    beforeEach(
        "Set up a gatekeeper network and gatekeeper",
        async () => {
            gatekeeperNetwork = Keypair.generate();
            await fund(gatekeeperNetwork.publicKey);

            gatekeeperService = await addGatekeeper(provider, gatekeeperNetwork, gatekeeper);
        }
    );

    beforeEach('Set up middleware PDA', async () => {
        [middlewareAccount, middlewareBump] = await deriveCheckPassMiddlewareAccountAddress(gatekeeperNetwork.publicKey);

        await checkPassMiddlewareProgram.methods.create(gatekeeperNetwork.publicKey, middlewareBump).accounts({
            middlewareAccount,
            authority: authority.publicKey,
        }).rpc({skipPreflight: true});
    })

    beforeEach('Set up generative Cryptid Account with middleware', async () => {
        [cryptidAccount, cryptidBump] = await deriveCryptidAccountAddressWithMiddleware(didAccount, middlewareAccount);

        if (!process.env.QUIET) {
            console.log("Accounts", {
                didAccount: didAccount.toBase58(),
                gatekeeperNetwork: gatekeeperNetwork.publicKey.toBase58(),
                gatekeeper: gatekeeper.publicKey.toBase58(),
                cryptidAccount: cryptidAccount.toBase58(),
                middlewareAccount: middlewareAccount.toBase58(),
                authority: authority.publicKey.toBase58(),
                recipient: recipient.publicKey.toBase58(),
            })
        }

        await fund(cryptidAccount, 20 * LAMPORTS_PER_SOL);
    })

    it("blocks a transfer with no gateway token", async () => {
        const transactionAccount = Keypair.generate();
        // get the gateway token address but don't actually create the gateway token
        const missingGatewayToken = await getGatewayTokenAddressForOwnerAndGatekeeperNetwork(authority.publicKey, gatekeeperNetwork.publicKey);

        // propose the Cryptid transaction
        await propose(transactionAccount);

        // fails to pass through the middleware
        const shouldFail = checkPass(transactionAccount, missingGatewayToken);

        // TODO expose the error message
        return expect(shouldFail).to.be.rejected;
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

        // TODO expose the error message
        return expect(shouldFail).to.be.rejected;
    });

    it("blocks a transfer if the gateway token is for the wrong gatekeeper network", async () => {
        const transactionAccount = Keypair.generate();

        // create a gatekeeper network, add the gatekeeper to it and issue a token from it.
        const wrongGatekeeperNetwork = Keypair.generate();
        await fund(wrongGatekeeperNetwork.publicKey);
        const wrongGatekeeperService = await addGatekeeper(provider, wrongGatekeeperNetwork, gatekeeper);
        const gatewayToken = await sendGatewayTransaction(() => wrongGatekeeperService.issue(authority.publicKey))

        // propose the Cryptid transaction
        await propose(transactionAccount);

        // fails to pass through the middleware
        const shouldFail = checkPass(transactionAccount, gatewayToken.publicKey);

        // TODO expose the error message
        return expect(shouldFail).to.be.rejected;
    });

    it("allows a transfer if the authority has a valid gateway token", async () => {
        const previousBalance = await balanceOf(cryptidAccount);

        const transactionAccount = Keypair.generate();

        // issue a gateway token to the authority
        const gatewayToken = await createGatewayToken(authority.publicKey);

        // propose the Cryptid transaction
        await propose(transactionAccount);

        // pass through the middleware
        await checkPass(transactionAccount, gatewayToken.publicKey);

        // execute the Cryptid transaction
        await execute(transactionAccount);

        const currentBalance = await balanceOf(cryptidAccount);
        expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Now the tx has been executed
    });

    it("allows a transfer if the DID account has a valid gateway token", async () => {
        // the difference between this one and the previous one is that it shows that
        // the gateway token can be associated with the DID account itself rather than the authority wallet
        const previousBalance = await balanceOf(cryptidAccount);

        const transactionAccount = Keypair.generate();

        // issue a gateway token to the authority
        const gatewayToken = await createGatewayToken(didAccount);

        // propose the Cryptid transaction
        await propose(transactionAccount);

        // pass through the middleware
        await checkPass(transactionAccount, gatewayToken.publicKey);

        // execute the Cryptid transaction
        await execute(transactionAccount);

        const currentBalance = await balanceOf(cryptidAccount);
        expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Now the tx has been executed
    });
});
