import {SignAllCallback, SignCallback, Wallet} from "../types/crypto";
import {Keypair, Transaction} from "@solana/web3.js";

const defaultSignAllCallback =
    (keypair: Keypair): SignAllCallback =>
        (transactions: Transaction[]) =>
            Promise.all(transactions.map((transaction) => {
                transaction.partialSign(keypair);
                return transaction;
            }));

const defaultSignCallback = (keypair: Keypair):SignCallback => (transaction) =>
    defaultSignAllCallback(keypair)([transaction])
        .then(transactions => transactions[0]);

export const isKeypair = (
    keypairOrWallet: Keypair | Wallet
): keypairOrWallet is Keypair =>
    keypairOrWallet instanceof Keypair ||
    // IDCOM-1340 this clause is added to handle type erasure on compiled TS
    keypairOrWallet.constructor.name === 'Keypair';

export const toWallet = (keypair: Keypair): Wallet => ({
    publicKey: keypair.publicKey,
    signTransaction: defaultSignCallback(keypair),
    signAllTransactions: defaultSignAllCallback(keypair),
});

export const noSignWallet = (): Wallet => ({
    publicKey: Keypair.generate().publicKey,
    signTransaction: () => Promise.reject(new Error('Not defined')),
    signAllTransactions: () => Promise.reject(new Error('Not defined')),
});

export const normalizeSigner = (keypairOrWallet: Keypair | Wallet): Wallet =>
    isKeypair(keypairOrWallet) ? toWallet(keypairOrWallet) : keypairOrWallet;