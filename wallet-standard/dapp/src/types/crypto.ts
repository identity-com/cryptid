import { PublicKey, Transaction } from "@solana/web3.js";

export type SignCallback = (transaction: Transaction) => Promise<Transaction>;
export type SignAllCallback = (
  transactions: Transaction[]
) => Promise<Transaction[]>;
export type Wallet = {
  publicKey: PublicKey;
  signTransaction: SignCallback;
  signAllTransactions: SignAllCallback;
};
