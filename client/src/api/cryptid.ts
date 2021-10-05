import { Connection, PublicKey, Transaction, TransactionSignature } from '@solana/web3.js';
import { DIDDocument, ServiceEndpoint } from 'did-resolver';
import { Signer } from '../types/crypto';

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
  /**
   * The signing key or callback used by the cryptid instance
   * Must be a key oo the DID, or a controlling DID
   */
  readonly signer: Signer;

  /**
   * The DID that owns this cryptid instance
   */
  readonly did: string;

  /**
   * Signs a transaction from the DID. Returns a metatransaction
   * that wraps the transaction into a call to the DOA program,
   * @param transaction
   */
  sign(transaction: Transaction): Promise<Transaction[]>;

  addKey(publicKey: PublicKey, alias: string): Promise<TransactionSignature>;
  removeKey(alias: string): Promise<TransactionSignature>;
  addService(service: ServiceEndpoint): Promise<TransactionSignature>;
  removeService(alias: string): Promise<TransactionSignature>;
  addController(did: string): Promise<TransactionSignature>;
  removeController(did: string): Promise<TransactionSignature>;

  document(): Promise<DIDDocument>;
  address(): Promise<PublicKey>;

  as(did: string): Cryptid;
  additionalKeys(): Promise<PublicKey[]>;
}
