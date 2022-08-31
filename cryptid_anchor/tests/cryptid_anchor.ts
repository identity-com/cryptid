import * as anchor from "@project-serum/anchor";
import {AnchorProvider, Program} from "@project-serum/anchor";
import {CryptidAnchor} from "../target/types/cryptid_anchor";
import {
    DID_SOL_PROGRAM,
    DidSolIdentifier,
    DidSolService,
    ExtendedCluster,
    VerificationMethodFlags,
    VerificationMethodType
} from "@identity.com/sol-did-client";
import {AccountMeta, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram} from "@solana/web3.js";
import chai from 'chai';
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const {expect} = chai;

const cluster: ExtendedCluster = 'localnet';
const CRYPTID_PROGRAM = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');

const toAccountMeta = (publicKey: PublicKey, isWritable: boolean = false, isSigner: boolean = false): AccountMeta => ({
    pubkey: publicKey,
    isWritable,
    isSigner,
})

// Creates a reference to an account, that is passed as part of cryptid instruction data for each account.
// TODO how to extract this from the anchor idl?
type TransactionAccountMeta = { key: number, meta: number };
const toTransactionAccountMeta = (publicKeyIndex: number, isWritable: boolean = false, isSigner: boolean = false):TransactionAccountMeta => ({
    key: publicKeyIndex,
    meta: (+isWritable << 1) | +isSigner,
})

// Creates transfer instruction data for embedding into a cryptid instruction.
// The from and to fields don't matter as they will be replaced
// with the accountMetas. The only thing that ends up in the data is the amount.
const transferInstructionData = (amount: number):Buffer => SystemProgram.transfer({
    fromPubkey: PublicKey.default,
    lamports: amount,
    toPubkey: PublicKey.default,
}).data

// creates an InstructionData object to be passed as a parameter to the cryptid instruction.
// Requires the following accounts in the following positions in the instruction:
// 0: the cryptid account to transfer from
// 4: the recipient account
// 5: the system program
const cryptidTransferInstruction = (amount: number) => (
    {
        programId: 5, // The System program - index 1 in remainingAccounts = 5 overall.
        accounts: [
            toTransactionAccountMeta(
                0 // Sender: the cryptid account - index 0 as passed into the instruction.
                , true, true),
            toTransactionAccountMeta(
                4, // The recipient - index 0 in remainingAccounts = 0 overall.
                true, false)
        ],
        data: transferInstructionData(amount),
    });

// The exported Anchor wallet type is messed up at the moment, so we define it indirectly here
type Wallet = AnchorProvider['wallet'];
const addKeyToDID = async (authority: Wallet, key: PublicKey) => {
    const did = DidSolIdentifier.create(authority.publicKey, cluster);
    const didSolService = await DidSolService.build(did, undefined, authority);
    const newKeyVerificationMethod = {
        flags: VerificationMethodFlags.CapabilityInvocation,
        fragment: `key${Date.now()}`, // randomise fragment name, so that we can add multiple keys in multiple tests.
        keyData: key.toBytes(),
        methodType: VerificationMethodType.Ed25519VerificationKey2018
    };

    await didSolService.addVerificationMethod(newKeyVerificationMethod).rpc()//{ skipPreflight: true, commitment: 'finalized' });
}

describe("cryptid_anchor", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());

    const program = anchor.workspace.CryptidAnchor as Program<CryptidAnchor>;
    const programProvider = program.provider as anchor.AnchorProvider;

    const authority = programProvider.wallet;

    let didAccount: PublicKey;
    let cryptidAccount: PublicKey;
    let cryptidBump: number;

    const balanceOf = (publicKey: PublicKey):Promise<number> => programProvider.connection.getAccountInfo(publicKey).then(a => a ? a.lamports : 0);

    const fund = async (publicKey: PublicKey, amount: number) => {
        const blockhash = await programProvider.connection.getLatestBlockhash();
        const tx = await programProvider.connection.requestAirdrop(publicKey, amount);
        // wait for the airdrop
        await programProvider.connection.confirmTransaction({
            ...blockhash, signature: tx
        });
    }

    before('Report tx logs to console for debugging', () => {
        programProvider.connection.onLogs("all", (log) =>
            console.log(log.logs)
        );
    });

    before('Set up DID account', async () => {
        const did = DidSolIdentifier.create(authority.publicKey, cluster);
        [didAccount] = await did.dataAccount();

        // Initialize a DID because the generative case is not working yet.
        const didSolService = await DidSolService.build(did, undefined, authority);
        await didSolService.initialize(10_000).rpc();
    })

    before('Set up generative Cryptid Account', async () => {
        [cryptidAccount, cryptidBump] = await PublicKey.findProgramAddress(
            [anchor.utils.bytes.utf8.encode("cryptid_account"),
                DID_SOL_PROGRAM.toBuffer(),
                didAccount.toBuffer()],
            CRYPTID_PROGRAM
        );

        await fund(cryptidAccount, 20 * LAMPORTS_PER_SOL);
    })

    it("can transfer through Cryptid", async () => {
        const recipient = Keypair.generate();

        const instructionData = cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL

        const previousBalance = await balanceOf(cryptidAccount);

        // execute the Cryptid transaction
        await program.methods.directExecute(
            Buffer.from([]),  // no controller chain
            [instructionData],
            cryptidBump,
            0
        ).accounts({
                cryptidAccount,
                didProgram: DID_SOL_PROGRAM,
                did: didAccount,
                signer: authority.publicKey,
            }
        ).remainingAccounts([
            toAccountMeta(recipient.publicKey, true, false),
            toAccountMeta(SystemProgram.programId)
        ]).rpc({ skipPreflight: true }); // skip preflight so we see validator logs on error

        const currentBalance = await balanceOf(cryptidAccount);

        expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Should have lost 1 SOL
    });

    it("rejects the transfer if the cryptid account is not a signer", async () => {
        const recipient = Keypair.generate();

        const instructionData = cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL

        // set the cryptid account as a non-signer on the transfer
        instructionData.accounts[0].meta = 2; // writable but not a signer

        // execute the Cryptid transaction
        const shouldFail = program.methods.directExecute(
            Buffer.from([]),  // no controller chain
            [instructionData],
            cryptidBump,
            0
        ).accounts({
                cryptidAccount,
                didProgram: DID_SOL_PROGRAM,
                did: didAccount,
                signer: authority.publicKey,
            }
        ).remainingAccounts([
            toAccountMeta(recipient.publicKey, true, false),
            toAccountMeta(SystemProgram.programId)
        ]).rpc({ skipPreflight: true }); // skip preflight so we see validator logs on error

        return expect(shouldFail).to.be.rejectedWith(/MissingRequiredSignature/);
    });

    it("rejects the transfer if the recipient account index is invalid", async () => {
        const recipient = Keypair.generate();

        const instructionData = cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL

        // set the recipient account as an invalid account index
        instructionData.accounts[1].key = 100; // account 100 does not exist

        // execute the Cryptid transaction
        const shouldFail = program.methods.directExecute(
            Buffer.from([]),  // no controller chain
            [instructionData],
            cryptidBump,
            0
        ).accounts({
                cryptidAccount,
                didProgram: DID_SOL_PROGRAM,
                did: didAccount,
                signer: authority.publicKey,
            }
        ).remainingAccounts([
            toAccountMeta(recipient.publicKey, true, false),
            toAccountMeta(SystemProgram.programId)
        ]).rpc({ skipPreflight: true }); // skip preflight so we see validator logs on error

        // TODO expose the actual error from the program
        return expect(shouldFail).to.be.rejectedWith(/ProgramFailedToComplete/);
    });

    it("rejects the transfer if the signer is not a valid signer on the DID", async () => {
        const recipient = Keypair.generate();
        const bogusSigner = Keypair.generate();

        const instructionData = cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL

        // execute the Cryptid transaction
        const shouldFail = program.methods.directExecute(
            Buffer.from([]),  // no controller chain
            [instructionData],
            cryptidBump,
            0
        ).accounts({
                cryptidAccount,
                didProgram: DID_SOL_PROGRAM,
                did: didAccount,
                signer: bogusSigner.publicKey,   // specify the bogus signer as the cryptid signer
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

    it("can transfer through Cryptid with a second key on the DID", async () => {
        const secondKey = Keypair.generate();
        const recipient = Keypair.generate();

        const instructionData = cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL

        // thunk to execute the Cryptid transaction
        const execute = () =>
            program.methods.directExecute(
                Buffer.from([]),  // no controller chain
                [instructionData],
                cryptidBump,
                0
            ).accounts({
                    cryptidAccount,
                    didProgram: DID_SOL_PROGRAM,
                    did: didAccount,
                    signer: secondKey.publicKey, // the second key is the signer
                }
            ).remainingAccounts([
                toAccountMeta(recipient.publicKey, true, false),
                toAccountMeta(SystemProgram.programId)
            ]).signers(
                [secondKey]    // sign with the second key
            ).rpc({ skipPreflight: true }); // skip preflight so we see validator logs on error

        const previousBalance = await balanceOf(cryptidAccount);

        // should fail before the key is added:
        expect(execute()).to.be.rejected;

        // add the second key to the did
        await addKeyToDID(authority, secondKey.publicKey);

        // should pass afterwards
        await execute();

        const currentBalance = await balanceOf(cryptidAccount);

        expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Should have lost 1 SOL
    });

    it("can transfer through Cryptid with an additonal key on the DID, without the first key signing at all", async () => {
        // The difference between this case and the above, is that in the above case, the first key
        // is paying fees, and is therefore still a signer on the tx. In this case, only the second key is present

        const secondKey = Keypair.generate();
        const secondKeyProvider = new AnchorProvider(
            programProvider.connection,
            new anchor.Wallet(secondKey),
            AnchorProvider.defaultOptions()
        );
        const secondKeyAuthority = secondKeyProvider.wallet;
        const secondKeyProgram = new Program<CryptidAnchor>(
            program.idl,
            program.programId,
            secondKeyProvider,
            program.coder
        );
        // fund the second key, because it has to pay gas this time
        await fund(secondKey.publicKey, LAMPORTS_PER_SOL);

        const recipient = Keypair.generate();

        const instructionData = cryptidTransferInstruction(LAMPORTS_PER_SOL); // 1 SOL

        console.log("accounts", {
            cryptidAccount: cryptidAccount.toBase58(),
            recipient: recipient.publicKey.toBase58(),
            signer: secondKeyAuthority.publicKey.toBase58(),
            DID_SOL_PROGRAM: DID_SOL_PROGRAM.toBase58(),
        })

        // thunk to execute the Cryptid transaction
        const execute = () =>
            secondKeyProgram.methods.directExecute(
                Buffer.from([]),  // no controller chain
                [instructionData],
                cryptidBump,
                0
            ).accounts({
                    cryptidAccount,
                    didProgram: DID_SOL_PROGRAM,
                    did: didAccount,
                    signer: secondKeyAuthority.publicKey, // the second key is the signer
                }
            ).remainingAccounts([
                toAccountMeta(recipient.publicKey, true, false),
                toAccountMeta(SystemProgram.programId)
            ]).rpc({ skipPreflight: true }); // skip preflight so we see validator logs on error

        const previousBalance = await balanceOf(cryptidAccount);

        // should fail before the key is added:
        expect(execute()).to.be.rejected;

        // add the second key to the did
        await addKeyToDID(authority, secondKey.publicKey);

        console.log("added key to did")

        // should pass afterwards
        await execute();

        const currentBalance = await balanceOf(cryptidAccount);

        expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL); // Should have lost 1 SOL
    });
});
