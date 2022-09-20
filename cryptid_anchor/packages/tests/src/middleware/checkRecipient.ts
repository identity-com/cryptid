import {Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram} from "@solana/web3.js";
import chai from 'chai';
import chaiAsPromised from "chai-as-promised";
import {
    cryptidTransferInstruction,
    toAccountMeta, createCryptidAccount, deriveCheckRecipientMiddlewareAccountAddress
} from "../util/cryptid";
import {initializeDIDAccount} from "../util/did";
import {fund, createTestContext, balanceOf} from "../util/anchorUtils";
import {DID_SOL_PROGRAM} from "@identity.com/sol-did-client";
import {CryptidClient, InstructionData, CRYPTID_PROGRAM} from "@identity.com/cryptid";

chai.use(chaiAsPromised);
const {expect} = chai;

describe("Middleware: checkRecipient", () => {
    const {
        program,
        authority,
        middleware: {
            checkRecipient: checkRecipientMiddlewareProgram,
        }
    } = createTestContext();

    let didAccount: PublicKey;
    let cryptidAccount: PublicKey;
    let cryptidBump: number;

    let middlewareAccount: PublicKey;
    let middlewareBump: number;

    let recipient = Keypair.generate();
    const transferInstructionData = cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL

    let cryptid: CryptidClient;

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

    const checkRecipient = (transactionAccount: Keypair) =>
        // execute the check recipient middleware, to ensure that the correct recipient is used in the tx
        checkRecipientMiddlewareProgram.methods.executeMiddleware().accounts({
                middlewareAccount,
                transactionAccount: transactionAccount.publicKey,
                cryptidProgram: CRYPTID_PROGRAM
            }
        ).rpc({skipPreflight: true}); // skip preflight so we see validator logs on error

    before('Set up DID account', async () => {
        await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
        didAccount = await initializeDIDAccount(authority);
    })

    before('Set up middleware PDA', async () => {
        [middlewareAccount, middlewareBump] = await deriveCheckRecipientMiddlewareAccountAddress(authority.publicKey, 0);

        await checkRecipientMiddlewareProgram.methods.create(recipient.publicKey, 0, middlewareBump).accounts({
            middlewareAccount,
            authority: authority.publicKey,
        }).rpc({skipPreflight: true});
    })

    before('Set up Cryptid Account with middleware', async () => {
        [cryptidAccount, cryptidBump] = await createCryptidAccount(program, didAccount, middlewareAccount);

        if (!process.env.QUIET) {
            console.log("Accounts", {
                didAccount: didAccount.toBase58(),
                cryptidAccount: cryptidAccount.toBase58(),
                middlewareAccount: middlewareAccount.toBase58(),
                authority: authority.publicKey.toBase58(),
                recipient: recipient.publicKey.toBase58(),
            })
        }

        await fund(cryptidAccount, 20 * LAMPORTS_PER_SOL);
    })

    it("can execute a transfer to the specified recipient", async () => {
        const previousBalance = await balanceOf(cryptidAccount);

        const transactionAccount = Keypair.generate();

        // propose the Cryptid transaction
        await propose(transactionAccount);

        // pass through the middleware
        await checkRecipient(transactionAccount);

        // execute the Cryptid transaction
        await execute(transactionAccount);

        const currentBalance = await balanceOf(cryptidAccount);
        expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Now the tx has been executed
    });

    it("blocks a transfer not passed by the middleware", async () => {
        const transactionAccount = Keypair.generate();

        // propose the Cryptid transaction
        await propose(transactionAccount);

        // execute the Cryptid transaction without passing through middleware
        const shouldFail = execute(transactionAccount);

        // TODO expose the error message
        return expect(shouldFail).to.be.rejected;
    });

    it("blocks a transfer to a different recipient", async () => {
        // change the recipient
        recipient = Keypair.generate();

        const transactionAccount = Keypair.generate();

        // propose the Cryptid transaction
        await propose(transactionAccount);

        // fails to pass through the middleware
        const shouldFail = checkRecipient(transactionAccount);

        // TODO expose the error message
        return expect(shouldFail).to.be.rejected;
    });
});
