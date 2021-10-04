import { Connection, PublicKey, Transaction, TransactionSignature } from '@solana/web3.js';
import { DIDDocument, ServiceEndpoint } from 'did-resolver';

export type PayerOption = 'DID_PAYS' | 'SIGNER_PAYS';
export type CryptidOptions = {
  connection: Connection;
  waitForConfirmation?: boolean;
  rentPayer?: PayerOption;
};

export const DEFAULT_CRYPTID_OPTIONS: Partial<CryptidOptions> = {
  rentPayer: 'DID_PAYS',
};

export interface Cryptid {
  sign(transaction: Transaction): Promise<Transaction[]>;

  addKey(publicKey: PublicKey, alias: string): Promise<TransactionSignature>;
  removeKey(alias: string): Promise<TransactionSignature>;
  addService(service: ServiceEndpoint): Promise<TransactionSignature>;
  removeService(alias: string): Promise<TransactionSignature>;
  addController(did: string): Promise<TransactionSignature>;
  removeController(did: string): Promise<TransactionSignature>;

  document(): Promise<DIDDocument>;
  address(): Promise<PublicKey>;
}
