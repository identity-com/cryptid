import { Connection, PublicKey, Transaction } from '@solana/web3.js';
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

  addKey(publicKey: PublicKey, alias: string): Promise<string>;
  removeKey(alias: string): Promise<string>;
  addService(service: ServiceEndpoint): Promise<string>;
  removeService(alias: string): Promise<string>;
  addController(did: string): Promise<string>;
  removeController(did: string): Promise<string>;

  document(): Promise<DIDDocument>;
  address(): Promise<PublicKey>;

  as(did: string): Cryptid;
}
