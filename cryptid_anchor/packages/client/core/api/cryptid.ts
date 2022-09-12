import {
  ConfirmOptions,
  Connection,
  PublicKey,
  Transaction,
  TransactionSignature,
} from '@solana/web3.js';
import { DIDDocument } from 'did-resolver';
import { Wallet } from '../types/crypto';
import { NonEmptyArray } from '../types/lang';
import {TransactionAccount} from "../types";

export type PayerOption = 'DID_PAYS' | 'SIGNER_PAYS';
export type CryptidOptions = {
  // The index of the cryptid account - default 0
  // Cryptid allows multiple accounts per DID, all derivable via an index field.
  accountIndex: number
  connection: Connection;
  confirmOptions?: ConfirmOptions;
  waitForConfirmation?: boolean;
  rentPayer?: PayerOption;
};

export const DEFAULT_CRYPTID_OPTIONS: Partial<CryptidOptions> = {
  accountIndex: 0,
  rentPayer: 'DID_PAYS',
};

export interface Cryptid {
  /**
   * The signing key or callback used by the Cryptid instance
   * Must be a key on the DID, or a controlling DID
   */
  readonly wallet: Wallet;

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
  listPendingTx(): Promise<[PublicKey, TransactionAccount][]>;

  /**
   * Signs a set of setup transactions followed by an execute transaction
   * that should be sent to the dapp
   * @param transaction The transaction to sign
   */
  signLarge(transaction: Transaction): Promise<{
    setupTransactions: NonEmptyArray<Transaction>;
    executeTransaction: Transaction;
  }>;

  // TODO Reinstate
  // cancelLarge(transactionAccount: PublicKey): Promise<TransactionSignature>;

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
}
