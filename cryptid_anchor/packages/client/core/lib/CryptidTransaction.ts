import {InstructionData, TransactionAccount, TransactionAccountMeta} from "../types";
import {AccountMeta, PublicKey, TransactionInstruction} from "@solana/web3.js";
import {extractAccountMetas, toInstructionData, transactionAccountMetasToAccountMetas, uniqueKeys} from "./cryptid";
import {Program} from "@project-serum/anchor";
import {Cryptid} from "@identity.com/cryptid-idl";
import {DID_SOL_PROGRAM} from "@identity.com/sol-did-client";
import {CryptidAccount} from "./CryptidAccount";

const NULL_KEY = new PublicKey("00000000000000000000000000000000")

export class CryptidTransaction {
    constructor(
        readonly cryptidAccount: CryptidAccount,
        readonly authority: PublicKey,
        readonly instructions: InstructionData[],
        readonly accountMetas: AccountMeta[]
    ) {}

    static fromSolanaInstructions(
        cryptidAccount: CryptidAccount,
        authority: PublicKey,
        solanaInstructions: TransactionInstruction[]
    ):CryptidTransaction {
        const accountMetas = extractAccountMetas(solanaInstructions);
        // The accounts available to the instructions are in the following order:
        // Execute Transaction Accounts:
        // 0 - cryptid account
        // 1 - did*
        // 2 - did program*
        // 3 - signer*
        // ... remaining accounts
        //
        // * These accounts are omitted from the Propose Transaction Accounts but included in the execute instructions
        const availableInstructionAccounts = uniqueKeys([
            cryptidAccount.address,
            cryptidAccount.didAccount,
            DID_SOL_PROGRAM,
            // This key is added in place of the signer,
            // so that the InstructionData are required to reference the signer in a separate position in the array,
            // and not index 3. This is because the signer is not known at creation time.
            // TODO: This is not the case for DirectExecute, so we could optimise here.
            NULL_KEY,
            ...accountMetas.map(a => a.pubkey)
        ]);
        const instructions = solanaInstructions.map(toInstructionData(availableInstructionAccounts));

        return new CryptidTransaction(
            cryptidAccount,
            authority,
            instructions,
            accountMetas
        )
    }

    static fromTransactionAccount(
        cryptidAccount: CryptidAccount,
        authority: PublicKey,
        transactionAccount: TransactionAccount
    ): CryptidTransaction {
        // TODO remove typecasting in this function
        const instructions = transactionAccount.instructions as InstructionData[];
        const accounts = transactionAccount.accounts;
        const accountMetas = transactionAccountMetasToAccountMetas(
            instructions.flatMap(i =>
                (i.accounts as TransactionAccountMeta[])
            ),
            accounts
        );

        return new CryptidTransaction(
            cryptidAccount,
            authority,
            instructions,
            accountMetas
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
            this.cryptidAccount.index
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
                didProgram: DID_SOL_PROGRAM,
                did: this.cryptidAccount.didAccount,
                signer: this.authority,
            }
        ).remainingAccounts(
            this.accountMetas
        )
    }
}