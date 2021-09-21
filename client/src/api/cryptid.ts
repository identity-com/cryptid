import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { DIDDocument } from 'did-resolver';

export type CryptidOptions = {
  connection: Connection;
  waitForConfirmation?: boolean;
};

export interface Cryptid {
  sign(transaction: Transaction): Promise<Transaction[]>;
  addKey(publicKey: PublicKey, alias: string): Promise<string>;
  document(): Promise<DIDDocument>;
}
