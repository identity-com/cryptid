import {AccountMeta, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import {DID_SOL_PROGRAM} from "@identity.com/sol-did-client";
import {
    CHECK_PASS_MIDDLEWARE_PROGRAM,
    CHECK_RECIPIENT_MIDDLEWARE_PROGRAM,
    CRYPTID_PROGRAM,
    TIME_DELAY_MIDDLEWARE_PROGRAM
} from "./constants";
import {InstructionData, TransactionAccountMeta} from "@identity.com/cryptid-core";
import BN from "bn.js";
import {Program} from "@project-serum/anchor";
import {Cryptid} from "@identity.com/cryptid-idl";

export const toAccountMeta = (publicKey: PublicKey, isWritable: boolean = false, isSigner: boolean = false): AccountMeta => ({
    pubkey: publicKey,
    isWritable,
    isSigner,
})

// Creates a reference to an account, that is passed as part of cryptid instruction data for each account.
const toTransactionAccountMeta = (publicKeyIndex: number, isWritable: boolean = false, isSigner: boolean = false): TransactionAccountMeta => ({
    key: publicKeyIndex,
    meta: (+isWritable << 1) | +isSigner,
})

// Creates transfer instruction data for embedding into a cryptid instruction.
// The from and to fields don't matter as they will be replaced
// with the accountMetas. The only thing that ends up in the data is the amount.
const transferInstructionData = (amount: number): Buffer => SystemProgram.transfer({
    fromPubkey: PublicKey.default,
    lamports: amount,
    toPubkey: PublicKey.default,
}).data

// creates an InstructionData object to be passed as a parameter to the cryptid instruction.
// Requires the following accounts in the following positions in the instruction:
// 0: the cryptid account to transfer from
// 4: the recipient account
// 5: the system program
export const cryptidTransferInstruction = (amount: number):InstructionData => (
    {
        programId: 5, // The System program - index 1 in remainingAccounts = 5 overall.
        accounts: [
            toTransactionAccountMeta(
                0 // Sender: the cryptid account - index 0 as passed into the instruction.
                , true, true),
            toTransactionAccountMeta(
                4, // The recipient - index 0 in remainingAccounts = 4 overall.
                true, false)
        ],
        data: transferInstructionData(amount),
    });

export const deriveCryptidAccountAddress = (didAccount: PublicKey, index: number = 0): Promise<[PublicKey, number]> => PublicKey.findProgramAddress(
    [
        anchor.utils.bytes.utf8.encode("cryptid_account"),
        DID_SOL_PROGRAM.toBuffer(),
        didAccount.toBuffer(),
        new BN(index).toArrayLike(Buffer, "le", 4)
    ],
    CRYPTID_PROGRAM
);

export const deriveCheckRecipientMiddlewareAccountAddress = (authority: PublicKey, nonce: number): Promise<[PublicKey, number]> => PublicKey.findProgramAddress(
    [
        anchor.utils.bytes.utf8.encode("check_recipient"),
        authority.toBuffer(),
        Buffer.from([nonce]),
    ],
    CHECK_RECIPIENT_MIDDLEWARE_PROGRAM
);

export const deriveCheckPassMiddlewareAccountAddress = (authority: PublicKey, gatekeeperNetwork: PublicKey): Promise<[PublicKey, number]> => PublicKey.findProgramAddress(
    [
        anchor.utils.bytes.utf8.encode("check_pass"),
        authority.toBuffer(),
        gatekeeperNetwork.toBuffer(),
    ],
    CHECK_PASS_MIDDLEWARE_PROGRAM
);

export const deriveTimeDelayMiddlewareAccountAddress = (authority: PublicKey, seconds: number): Promise<[PublicKey, number]> => PublicKey.findProgramAddress(
    [
        anchor.utils.bytes.utf8.encode("time_delay"),
        authority.toBuffer(),
        new BN(seconds).toArrayLike(Buffer, "le", 8),
    ],
    TIME_DELAY_MIDDLEWARE_PROGRAM
);

export const deriveTimeDelayTransactionStateMiddlewareAccountAddress = (transaction_account: PublicKey): Promise<[PublicKey, number]> => PublicKey.findProgramAddress(
    [
        anchor.utils.bytes.utf8.encode("time_delay_creation_time"),
        transaction_account.toBuffer()
    ],
    TIME_DELAY_MIDDLEWARE_PROGRAM
);

export const createCryptidAccount = async (
    program: Program<Cryptid>,
    did: PublicKey,
    middlewareAccount?: PublicKey,
    index: number = 0,
): Promise<[PublicKey, number]> => {
    const [cryptidAccount, cryptidBump] = await deriveCryptidAccountAddress(did, index);

    await program.methods.create(
        middlewareAccount || null,  // anchor requires null instead of undefined
        index,
        cryptidBump
    ).accounts({
        cryptidAccount,
        didProgram: DID_SOL_PROGRAM,
        did,
        authority: program.provider.publicKey
    }).rpc({skipPreflight: true});

    return [cryptidAccount, cryptidBump]
}

// use this when testing against the cryptid client
export const makeTransfer = (from: PublicKey, to: PublicKey) =>
    // A transaction that sends 1 SOL to the recipient
    new Transaction().add(SystemProgram.transfer({
        fromPubkey: from,
        toPubkey: to,
        lamports: LAMPORTS_PER_SOL
    }))