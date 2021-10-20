import { PublicKey, Transaction } from '@solana/web3.js';

export type SignCallback = (transaction: Transaction) => Promise<Transaction>;
export type SignMessageCallback = (message: Uint8Array) => Promise<Uint8Array>;
export type Signer = {
  publicKey: PublicKey;
  sign: SignCallback;
  signMessage?: SignMessageCallback;
};
