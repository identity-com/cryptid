import { PublicKey, Transaction } from '@solana/web3.js';

export type SignCallback = (transaction: Transaction) => Promise<Transaction>;
export type Signer = {
  publicKey: PublicKey;
  sign: SignCallback;
};
