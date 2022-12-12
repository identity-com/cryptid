import { registerWallet } from './register.js';
import { CryptidWalletWallet } from './wallet.js';
import type { CryptidWallet } from './window.js';
import { Keypair } from '@solana/web3.js';

export function initialize(cryptidWallet: CryptidWallet): void {
    let keypair = Keypair.generate();

    cryptidWallet: cryptidWallet = {
        publicKey: keypair.publicKey,
        connect,
        disconnect,
        signAndSendTransaction,
        signTransaction,
        signAllTransactions,
        signMessage,
    };
    registerWallet(new CryptidWalletWallet(cryptidWallet));
}
