import { LocalStorageWalletProvider } from './localStorage';
import {SolanaAdapterWalletProvider} from "./adapter";
import { PublicKey, Transaction } from '@solana/web3.js';

export class WalletProviderFactory {
  static getProvider(type: string, args: unknown): WalletProviderInterface {
    if (type === 'local') {
      return new LocalStorageWalletProvider(args);
    }

    if (type === 'adapter') {
      return new SolanaAdapterWalletProvider(args);
    }

    throw new Error(`Unknown WalletProviderType: ${type}`)
  }
}

export interface WalletProviderInterface {
  publicKey: PublicKey;
  init: () => Promise<WalletProviderInterface>
  signTransaction(transaction: Transaction): Promise<Transaction>;
  createSignature(message: Uint8Array): string;
}

