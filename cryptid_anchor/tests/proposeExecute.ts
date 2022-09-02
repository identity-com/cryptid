import {Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram} from "@solana/web3.js";
import chai from 'chai';
import chaiAsPromised from "chai-as-promised";
import {cryptidTransferInstruction, deriveCryptidAccountAddress, toAccountMeta} from "./util/cryptid";
import {initializeDIDAccount} from "./util/did";
import {fund, createTestContext, balanceOf} from "./util/anchorUtils";
import {DID_SOL_PROGRAM} from "@identity.com/sol-did-client";
import {InstructionData} from "./util/types";

chai.use(chaiAsPromised);
const {expect} = chai;

describe("proposeExecute", () => {
    const {
        program,
        authority,
    } = createTestContext();

    let didAccount: PublicKey;
    let cryptidAccount: PublicKey;
    let cryptidBump: number;

    const recipient = Keypair.generate();
    const transferInstructionData = cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL

    const propose = async (transactionAccount: Keypair, instruction: InstructionData = transferInstructionData) =>
        program.methods.proposeTransaction(
            [instruction],
            2,
        ).accounts({
                cryptidAccount,
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

    before('Set up DID account', async () => {
        await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
        didAccount = await initializeDIDAccount(authority);
    })

    before('Set up generative Cryptid Account', async () => {
        [cryptidAccount, cryptidBump] = await deriveCryptidAccountAddress(didAccount);

        await fund(cryptidAccount, 20 * LAMPORTS_PER_SOL);
    })

    it("can propose and execute a transfer through Cryptid", async () => {
        const previousBalance = await balanceOf(cryptidAccount);

        const transactionAccount = Keypair.generate();

        // propose the Cryptid transaction
        await propose(transactionAccount);

        let currentBalance = await balanceOf(cryptidAccount);
        expect(previousBalance - currentBalance).to.equal(0); // Nothing has happened yet

        // execute the Cryptid transaction
        await execute(transactionAccount);

        currentBalance = await balanceOf(cryptidAccount);
        expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Now the tx has been executed
    });

    it("can propose and execute in the same transaction", async () => {
        const previousBalance = await balanceOf(cryptidAccount);

        const transactionAccount = Keypair.generate();

        // propose the Cryptid transaction
        await propose(transactionAccount);

        let currentBalance = await balanceOf(cryptidAccount);
        expect(previousBalance - currentBalance).to.equal(0); // Nothing has happened yet

        // execute the Cryptid transaction
        await execute(transactionAccount);

        currentBalance = await balanceOf(cryptidAccount);
        expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Now the tx has been executed
    });

    it("can reuse the same transfer account", async () => {
        const previousBalance = await balanceOf(cryptidAccount);

        const transactionAccount = Keypair.generate();

        // Propose & execute once
        await propose(transactionAccount);
        await execute(transactionAccount);

        // Propose & execute twice
        await propose(transactionAccount);
        await execute(transactionAccount);

        const currentBalance = await balanceOf(cryptidAccount);

        // The tx has been executed twice
        // Note - this is not a double-spend, as the tx has to be proposed twice
        expect(previousBalance - currentBalance).to.equal(2 * LAMPORTS_PER_SOL);
    });

    it("cannot re-execute the same proposed transfer", async () => {
        const previousBalance = await balanceOf(cryptidAccount);

        const transactionAccount = Keypair.generate();

        // Propose & execute
        await propose(transactionAccount);
        await execute(transactionAccount);

        // cannot re-execute
        const shouldFail = execute(transactionAccount);

        const currentBalance = await balanceOf(cryptidAccount);

        // The tx has been executed once only
        expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL);

        // TODO expose the error message
        return expect(shouldFail).to.be.rejected;
    });

    it("rejects the execution if the cryptid account is not a signer", async () => {
        const transactionAccount = Keypair.generate();

        const instructionDataWithUnauthorisedSigner = cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL
        // set the cryptid account as a non-signer on the transfer
        instructionDataWithUnauthorisedSigner.accounts[0].meta = 2; // writable but not a signer

        await propose(transactionAccount, instructionDataWithUnauthorisedSigner);
        const shouldFail = execute(transactionAccount);

        return expect(shouldFail).to.be.rejectedWith(/MissingRequiredSignature/);
    });

    it("rejects the execution if the recipient account index is invalid", async () => {
        const transactionAccount = Keypair.generate();

        const instructionDataWithInvalidAccountIndex = cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL
        // set the recipient account as an invalid account index
        instructionDataWithInvalidAccountIndex.accounts[1].key = 100; // account 100 does not exist

        // TODO this should fail on propose
        await propose(transactionAccount, instructionDataWithInvalidAccountIndex);
        const shouldFail = execute(transactionAccount);

        return expect(shouldFail).to.be.rejectedWith(/ProgramFailedToComplete/);
    });

    it("rejects the transfer if the signer is not a valid signer on the DID", async () => {
        const transactionAccount = Keypair.generate();

        const bogusSigner = Keypair.generate();

        await propose(transactionAccount);
        // execute the Cryptid transaction
        const shouldFail = program.methods.executeTransaction(
            Buffer.from([]),  // no controller chain
            cryptidBump,
            0
        ).accounts({
                cryptidAccount,
                didProgram: DID_SOL_PROGRAM,
                did: didAccount,
                signer: bogusSigner.publicKey,   // specify the bogus signer as the cryptid signer
                destination: authority.publicKey,
                transactionAccount: transactionAccount.publicKey
            }
        ).remainingAccounts([
            toAccountMeta(recipient.publicKey, true, false),
            toAccountMeta(SystemProgram.programId)
        ]).signers(
            [bogusSigner]    // sign with the bogus signer
        ).rpc({ skipPreflight: true }); // skip preflight so we see validator logs on error

        // TODO expose the error from the program
        return expect(shouldFail).to.be.rejected;
    });
});
