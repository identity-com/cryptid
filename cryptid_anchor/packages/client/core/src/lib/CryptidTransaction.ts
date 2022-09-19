import {InstructionData, TransactionAccount, TransactionAccountMeta} from "../types";
import {AccountMeta, Keypair, PublicKey, TransactionInstruction} from "@solana/web3.js";
import {
    extractAccountMetas,
    toAccountMeta,
    toInstructionData,
    transactionAccountMetasToAccountMetas,
    uniqueKeys
} from "./cryptid";
import {Accounts, Program} from "@project-serum/anchor";
import {Cryptid} from "@identity.com/cryptid-idl";
import {DID_SOL_PROGRAM} from "@identity.com/sol-did-client";
import {CryptidAccountDetails} from "./CryptidAccountDetails";

// Used to replace the current signer
// so that the InstructionData are required to reference the signer in a separate position in the array,
// and not index 3. This is because the signer is not known at creation time.
// TODO - PublicKey.default uses the default key 11111111111111111111111111111111 which is the same as the system program.
// This is unsuitable as it may be referenced in the instructions somewhere. So we generate a "single use" key here.
// It feels hacky - is there a better alternative?
const NULL_KEY = Keypair.generate().publicKey // PublicKey.default;

export class CryptidTransaction {
    constructor(
        readonly cryptidAccount: CryptidAccountDetails,
        readonly authority: PublicKey,
        readonly instructions: InstructionData[],
        readonly accountMetas: AccountMeta[]
    ) {}

    static fromSolanaInstructions(
        cryptidAccount: CryptidAccountDetails,
        authority: PublicKey,
        solanaInstructions: TransactionInstruction[]
    ):CryptidTransaction {
        const accountMetas = extractAccountMetas(solanaInstructions, cryptidAccount);
        // The accounts available to the instructions are in the following order:
        // Execute Transaction Accounts:
        // 0 - cryptid account
        // 1 - did*
        // 2 - did program*
        // 3 - signer*
        // ... remaining accounts
        //
        // * These accounts are omitted from the Propose Transaction Accounts but included in the execute instructions
        const namedAccounts = [cryptidAccount.address,
            cryptidAccount.didAccount,
            DID_SOL_PROGRAM,
            // This key is added in place of the signer (aka authority),
            // so that the InstructionData are required to reference the signer in a separate position in the array,
            // and not index 3. This is because the signer at execute time is not known at creation time,
            // and may be different to the authority here.
            // TODO: This is not the case for DirectExecute, so we could optimise here.
            NULL_KEY];
        const availableInstructionAccounts = uniqueKeys([
            ...namedAccounts,
            ...accountMetas.map(a => a.pubkey)
        ]);
        const instructions = solanaInstructions.map(toInstructionData(availableInstructionAccounts));
        const filteredAccountMetas = accountMetas.filter(a => !namedAccounts.map(account => account.toBase58()).includes(a.pubkey.toBase58()));

        console.log("availableInstructionAccounts", availableInstructionAccounts.map(a => a.toString()));
        console.log("instructions", instructions);
        console.log("accountMetas", accountMetas.map(a => ({pubkey: a.pubkey.toString(), isSigner: a.isSigner, isWritable: a.isWritable})));
        console.log("filteredAccountMetas", filteredAccountMetas.map(a => ({pubkey: a.pubkey.toString(), isSigner: a.isSigner, isWritable: a.isWritable})));
        console.log("original accountMetas", solanaInstructions.flatMap(i => i.keys).map(a => ({pubkey: a.pubkey.toString(), isSigner: a.isSigner, isWritable: a.isWritable})));

        return new CryptidTransaction(
            cryptidAccount,
            authority,
            instructions,
            filteredAccountMetas
        )
    }

    static fromTransactionAccount(
        cryptidAccount: CryptidAccountDetails,
        authority: PublicKey,
        transactionAccount: TransactionAccount
    ): CryptidTransaction {
        console.log("transactionAccount", JSON.stringify(transactionAccount, null, 2));
        console.log("transactionAccount.instructions", transactionAccount.instructions);
        console.log("transactionAccount.accounts", transactionAccount.accounts);

        // TODO remove typecasting in this function
        const instructions = transactionAccount.instructions as InstructionData[];
        const namedAccounts = [
            cryptidAccount.address,
            cryptidAccount.didAccount,
            DID_SOL_PROGRAM,
            authority
        ]
        const remainingAccounts = transactionAccount.accounts;
        const allAccounts = [...namedAccounts, ...remainingAccounts];
        console.log("allAccounts", allAccounts.map(a => a.toString()));
        const accountMetas = transactionAccountMetasToAccountMetas(
            instructions.flatMap(i =>
                ([...i.accounts as TransactionAccountMeta[], { key: i.programId, meta: 0}])
            ),
            allAccounts,
            cryptidAccount
        );
        console.log("accountMetas", accountMetas.map(a => ({pubkey: a.pubkey.toString(), isSigner: a.isSigner, isWritable: a.isWritable})));
        const filteredAccountMetas = accountMetas.filter(a => !namedAccounts.map(account => account.toBase58()).includes(a.pubkey.toBase58()));
        console.log("filteredAccountMetas", filteredAccountMetas.map(a => ({pubkey: a.pubkey.toString(), isSigner: a.isSigner, isWritable: a.isWritable})));

        return new CryptidTransaction(
            cryptidAccount,
            authority,
            instructions,
            filteredAccountMetas
        )
    }


    // TODO move transactionAccountAddress into constructor?
    propose(program: Program<Cryptid>, transactionAccountAddress: PublicKey) {
        return program.methods.proposeTransaction(
            this.instructions,
            this.accountMetas.length,
        ).accounts({
                cryptidAccount: this.cryptidAccount.address,
                owner: this.cryptidAccount.didAccount,
                authority: this.authority,
                transactionAccount: transactionAccountAddress
            }
        ).remainingAccounts(
            this.accountMetas
        )
    }

    // TODO move transactionAccountAddress into constructor?
    execute(program: Program<Cryptid>, transactionAccountAddress: PublicKey) {
        return program.methods.executeTransaction(
            Buffer.from([]),  // TODO, support controller chain,
            this.cryptidAccount.bump,
            0
        ).accounts({
                cryptidAccount: this.cryptidAccount.address,
                didProgram: DID_SOL_PROGRAM,
                did: this.cryptidAccount.didAccount,
                signer: this.authority,
                destination: this.authority,
                transactionAccount: transactionAccountAddress
            }
        ).remainingAccounts(
            this.accountMetas
        )
    }

    directExecute(program: Program<Cryptid>) {
        return program.methods.directExecute(
            Buffer.from([]),  // TODO, support controller chain,
            this.instructions,
            this.cryptidAccount.bump,
            this.cryptidAccount.index
        ).accounts({
                cryptidAccount: this.cryptidAccount.address,
                did: this.cryptidAccount.didAccount,
                didProgram: DID_SOL_PROGRAM,
                signer: this.authority,
            }
        ).remainingAccounts(
            this.accountMetas
        )
    }
}