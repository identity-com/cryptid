import {MessageSignerWalletAdapter} from "@solana/wallet-adapter-base";

export type SelectedPage = 'DID' | 'Storage' | 'Keys' | 'Ethereum';

export interface Web3Storage {
    add(content: string, name: string, did: string, wallet: MessageSignerWalletAdapter, progressCallback: (percent: number) => void): Promise<string>
    retrieve(hash: string): Promise<string>
}