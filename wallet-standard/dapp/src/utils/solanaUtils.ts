import {BlockhashWithExpiryBlockHeight, Connection, Transaction, TransactionInstruction} from "@solana/web3.js";
import {WalletContextState} from "@solana/wallet-adapter-react";
import { ExtendedCluster } from "@identity.com/sol-did-client";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

export const sendTransaction = (instructions: TransactionInstruction[], wallet: WalletContextState, connection: Connection, latestBlockhash: BlockhashWithExpiryBlockHeight):Promise<string> => {
    if (!wallet.publicKey) throw new Error('Wallet is not connected');
    const transaction = new Transaction(latestBlockhash).add(...instructions);
    return wallet.sendTransaction(transaction, connection);
}

export const fromSolanaCluster = (cluster: ExtendedCluster | undefined): WalletAdapterNetwork | undefined => {
    switch (cluster) {
        case 'mainnet-beta':
            return WalletAdapterNetwork.Mainnet;
        case 'testnet':
            return WalletAdapterNetwork.Testnet;
        case 'devnet':
            return WalletAdapterNetwork.Devnet;
        default:
    }
}

export const toSolanaCluster = (cluster: WalletAdapterNetwork | undefined): ExtendedCluster | undefined => {
    switch (cluster) {
        case WalletAdapterNetwork.Mainnet:
            return 'mainnet-beta';
        case WalletAdapterNetwork.Testnet:
            return 'testnet';
        case WalletAdapterNetwork.Devnet:
            return 'devnet';
    }
}
