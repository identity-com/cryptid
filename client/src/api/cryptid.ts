import {
  Connection,
  PublicKey,
  Transaction,
  TransactionSignature,
} from '@solana/web3.js';
import { DIDDocument, ServiceEndpoint } from 'did-resolver';
import { Signer } from '../types/crypto';
import { NonEmptyArray } from '../types/lang';

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
   * The signing key or callback used by the Cryptid instance
   * Must be a key on the DID, or a controlling DID
   */
  readonly signer: Signer;

  /**
   * The DID that owns this Cryptid instance
   */
  readonly did: string;

  /**
   * Signs a transaction from the DID. Returns a meta-transaction
   * that wraps the transaction into a call to the cryptid program
   * @param transaction The transaction to sign
   * @throws RangeError if the transaction size is too large
   */
  sign(transaction: Transaction): Promise<Transaction>;

  /**
   * List pending large transactions that were previously not executed
   */
  listPendingTx(): Promise<PublicKey[]>;

  /**
   * Signs a set of setup transactions followed by an execute transaction
   * that should be sent to the dapp
   * @param transaction The transaction to sign
   */
  signLarge(transaction: Transaction): Promise<{
    setupTransactions: NonEmptyArray<Transaction>;
    executeTransaction: Transaction;
  }>;

  /**
   * Adds a key to your the Crytid account
   * @param publicKey The public key to add
   * @param alias A unique alias for that key
   */
  addKey(publicKey: PublicKey, alias: string): Promise<TransactionSignature>;

  /**
   * Removes a key from the account
   * @param alias The alias of the key to remove
   */
  removeKey(alias: string): Promise<TransactionSignature>;

  /**
   * Adds a service to the Cryptid account instance
   * @param service The service to add
   */
  addService(service: ServiceEndpoint): Promise<TransactionSignature>;

  /**
   * Removes a service form the Cryptid account
   * @param alias The alias of the service to remove
   */
  removeService(alias: string): Promise<TransactionSignature>;

  /**
   * Adds a controller to the Cryptid account
   * @param did The DID of the controller to add
   */
  addController(did: string): Promise<TransactionSignature>;

  /**
   * Removes a controller from the Cryptis account
   * @param did The DID of the controller to remove
   */
  removeController(did: string): Promise<TransactionSignature>;

  /**
   * Retrieves the DID document for this Cryptid account
   */
  document(): Promise<DIDDocument>;

  /**
   * Gets the Cryptid address for the account
   */
  address(): Promise<PublicKey>;

  /**
   * Allows the current Cryptid instance to sign as another Cryptid account it is a controller of.
   * A new Cryptid instance is returned.
   * @param did The DID of the account to sign on behalf of.
   */
  as(did: string): Cryptid;

  additionalKeys(): Promise<PublicKey[]>;

  // TODO: Remove in future PR (lazy init the interface). Only selectedCryptidAccount has builder.
  updateSigner(signer: Signer): void;
}
