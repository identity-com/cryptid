// This is copied with modification from @wallet-standard/wallet

import { Connection, PublicKey, TransactionSignature, Transaction } from '@solana/web3.js';
import { build as buildCryptid, Cryptid, Signer } from '@identity.com/cryptid';
import type { WalletAccount } from '@wallet-standard/base';
import { SOLANA_CHAINS } from './solana.js';
import { DIDDocument } from 'did-resolver';

const chains = SOLANA_CHAINS;
const features = ['solana:signAndSendTransaction', 'solana:signTransaction', 'standard:signMessage'] as const;

export interface CryptidWalletWalletAccountInitData {
    didPrefix: string;
    didAddress: string;
    alias: string;
    signer: Signer;
    connection: Connection;
    isSelected: (account: CryptidWalletWalletAccount) => boolean;
    parent?: CryptidWalletWalletAccount;
}

export class CryptidWalletWalletAccount implements WalletAccount {
    readonly #address: WalletAccount['address'];
    readonly #publicKey: WalletAccount['publicKey'];
    readonly #chains: WalletAccount['chains'];
    readonly #features: WalletAccount['features'];
    readonly #label: WalletAccount['label'];
    readonly #icon: WalletAccount['icon'];
    _address: PublicKey;
    didPrefix: string;
    didAddress: string;
    alias: string;
    signer: Signer;
    connection: Connection;
    isSelected: (account: CryptidWalletWalletAccount) => boolean;
    parent?: CryptidWalletWalletAccount;
    _document: DIDDocument;
    private _cryptid: Cryptid;

    private updateDocWrapper = async (f: () => Promise<TransactionSignature>) => {
        const signature = f();
        await this.updateDocument();
        return signature;
    };

    updateDocument = async () => {
        this._document = await this.cryptid.document();
        return this._document;
    };

    get address() {
        return this.#address;
    }

    get publicKey() {
        return this.#publicKey.slice();
    }

    get chains() {
        return this.#chains.slice();
    }

    get features() {
        return this.#features.slice();
    }

    get label() {
        return this.#label;
    }

    get icon() {
        return this.#icon;
    }
    get cryptid() {
        return this._cryptid;
    }

    signTransaction = (transaction: Transaction): Promise<Transaction> => this.cryptid.sign(transaction);

    signLargeTransaction = (
        transaction: Transaction
    ): Promise<{ setupTransactions: Transaction[]; executeTransaction: Transaction }> =>
        this.cryptid.signLarge(transaction);

    cancelLargeTransaction = (transactionAccount: PublicKey): Promise<TransactionSignature> =>
        this.cryptid.cancelLarge(transactionAccount);

    listPendingTx = (): Promise<PublicKey[]> => this.cryptid.listPendingTx();

    constructor({ address, publicKey, label, icon }: Omit<WalletAccount, 'chains' | 'features'>) {
        if (new.target === CryptidWalletWalletAccount) {
            Object.freeze(this);
        }

        this.#address = address;
        this.#publicKey = publicKey;
        this.#chains = chains;
        this.#features = features;
        this.#label = label;
        this.#icon = icon;
    }
    async init() {
        this._address = await this.cryptid.address();
        await this.updateDocument();
        // console.log(`Getting address: ${this._address}`)
        // console.log(`Getting document: ${JSON.stringify(this.document)}`)
    }
}
