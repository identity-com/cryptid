import {ConfirmOptions, Connection, Keypair, PublicKey, Transaction} from "@solana/web3.js";
import {Wallet} from "../types/crypto";
import {AnchorProvider, Program} from "@project-serum/anchor";
import {Cryptid, CryptidIDL} from "@identity.com/cryptid-idl";
import {CRYPTID_PROGRAM} from "../constants";
import {TransactionAccount} from "../types";
import {CryptidTransaction} from "../lib/CryptidTransaction";
import {CryptidAccount} from "../lib/CryptidAccount";

export class CryptidService {
    readonly program: Program<Cryptid>;
    private authorityKey: PublicKey;

    constructor(authority: Wallet, readonly account: CryptidAccount, connection: Connection, opts: ConfirmOptions = {}) {
        const anchorProvider = new AnchorProvider(
            connection,
            authority,
            opts
        );

        this.authorityKey = authority.publicKey;

        this.program = new Program<Cryptid>(
            CryptidIDL,
            CRYPTID_PROGRAM,
            anchorProvider
        );
    }

    public listPendingTransactions():Promise<[PublicKey, TransactionAccount][]> {
        return this.program.account.transactionAccount.all([
            // TODO: Confirm these filters are correct
            { memcmp: { offset: 0, bytes: '1' } },
            { memcmp: { offset: 1, bytes: this.account.address.toBase58() } },
        ]).then(response => response.map(r =>  [
            r.publicKey,
            r.account as unknown as TransactionAccount  // TODO fix cast
        ]));
    }

    public async propose(transaction: Transaction): Promise<[Transaction, PublicKey]> {
        const transactionAccountAddress = Keypair.generate();
        const cryptidTransaction = CryptidTransaction.fromSolanaInstructions(
            this.account,
            this.authorityKey,
            transaction.instructions
        );
        const proposeTransaction = await cryptidTransaction.propose(this.program, transactionAccountAddress.publicKey)
            .signers(
                // The only signer in a proposal (other than an authority on the DID) is the transaction account
                [transactionAccountAddress]
            ).transaction().then(async t => {
                // TODO clean up
                // 1. should not be in a closure
                // 2. signing here happens at a different layer (service layer) to the directExecute (should be the same layer)
                // 3. duplicating the signing and blockhash stuff
                // 4. provider casting
                const {blockhash} = await this.program.provider.connection.getLatestBlockhash();
                t.recentBlockhash = blockhash;
                t.feePayer = this.authorityKey;
                t.partialSign(transactionAccountAddress)
                return (this.program.provider as AnchorProvider).wallet.signTransaction(t);
            });

        return [proposeTransaction, transactionAccountAddress.publicKey];
    }

    public async execute(transactionAccountAddress: PublicKey, signers: Keypair[] = []): Promise<Transaction> {
        const account = await this.program.account.transactionAccount.fetch(transactionAccountAddress);
        // TODO fix - the TransactionAccount type has `state` as type `never`
        const transactionAccount: TransactionAccount = account as unknown as TransactionAccount;

        const cryptidTransaction = CryptidTransaction.fromTransactionAccount(
            this.account,
            this.authorityKey,
            transactionAccount
        );
        return cryptidTransaction.execute(this.program, transactionAccountAddress)
            .signers([...signers]).transaction().then(async t => {
                // TODO clean up
                // 1. should not be in a closure
                // 2. signing here happens at a different layer (service layer) to the directExecute (should be the same layer)
                // 3. duplicating the signing and blockhash stuff
                // 4. provider casting
                const {blockhash} = await this.program.provider.connection.getLatestBlockhash();
                t.recentBlockhash = blockhash;
                t.feePayer = this.authorityKey;
                return (this.program.provider as AnchorProvider).wallet.signTransaction(t);
            });
    }

    public async directExecute(transaction: Transaction): Promise<Transaction> {
        const cryptidTransaction = CryptidTransaction.fromSolanaInstructions(
            this.account,
            this.authorityKey,
            transaction.instructions,
        );
        return cryptidTransaction.directExecute(this.program).transaction();
    }
}