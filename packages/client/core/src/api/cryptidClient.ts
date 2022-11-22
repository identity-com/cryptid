import {
  ConfirmOptions,
  Connection,
  PublicKey,
  Signer,
  Transaction,
  TransactionSignature,
} from "@solana/web3.js";
import { DIDDocument } from "did-resolver";
import { Wallet } from "../types/crypto";
import { ProposalResult, TransactionAccount } from "../types";
import { CryptidAccountDetails } from "../lib/CryptidAccountDetails";
import { Middleware } from "../lib/Middleware";
import { ExecuteArrayResult } from "../types/cryptid";

export type PayerOption = "DID_PAYS" | "SIGNER_PAYS";
export type CryptidOptions = {
  // The index of the cryptid account - default 0
  // Cryptid allows multiple accounts per DID, all derivable via an index field.
  accountIndex?: number;
  connection: Connection;
  confirmOptions?: ConfirmOptions;
  waitForConfirmation?: boolean;
  rentPayer?: PayerOption;
  middlewares?: Middleware[];
};
export type FindAllOptions = {
  connection: Connection;
};

export const DEFAULT_CRYPTID_OPTIONS: Partial<CryptidOptions> = {
  accountIndex: 0,
  rentPayer: "DID_PAYS",
};

/**
 * The primary client interface for interacting with Cryptid.
 *
 * Clients have the following options when signing a transaction:
 *
 * 1. directExecute: Single instruction, no middleware.
 * 2. propose / execute: Two separate calls, middleware is executed as part of the execute call.
 * 3. proposeAndExecute: Single call, returns an array of transactions to be passed to the chain.
 * If forceSingleTx is set to true, this forces all instructions into a single transaction.
 * Note: At present, there are no checks to see if it fits.
 */
export interface CryptidClient {
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
   * The details behind the cryptid account (address, owner, etc).
   */
  readonly details: CryptidAccountDetails;

  /**
   * Signs a transaction from the DID. Returns a meta-transaction
   * that wraps the transaction into a call to the cryptid program
   * @param transaction The transaction to sign
   * @throws RangeError if the transaction size is too large
   */
  directExecute(transaction: Transaction): Promise<Transaction>;

  /**
   * List pending large transactions that were previously not executed
   */
  listPendingTx(): Promise<[PublicKey, TransactionAccount][]>;

  /**
   * Signs a set of setup transactions followed by an execute transaction
   * that should be sent to the dapp
   * @param transaction The transaction to sign
   * @param forceSingleTx [false] If true, forces the transaction to be signed as a single transaction
   */
  // TODO forceSingleTx is likely temporary - we should not force the client to have to know whether
  // the tx can fit into a single cryptid transaction or not.
  proposeAndExecute(
    transaction: Transaction,
    forceSingleTx?: boolean
  ): Promise<ExecuteArrayResult>;

  propose(transaction: Transaction): Promise<ProposalResult>;
  execute(transactionAccountAddress: PublicKey): Promise<ExecuteArrayResult>;

  // TODO Reinstate
  // cancelLarge(transactionAccount: PublicKey): Promise<TransactionSignature>;

  /**
   * Retrieves the DID document for this Cryptid account
   */
  document(): Promise<DIDDocument>;

  /**
   * Gets the Cryptid address for the account
   */
  address(): PublicKey;

  /**
   * Allows the current Cryptid instance to sign as another Cryptid account it is a controller of.
   * A new Cryptid instance is returned.
   * @param did The DID of the account to sign on behalf of.
   */
  as(did: string): CryptidClient;

  additionalKeys(): Promise<PublicKey[]>;

  send(
    transaction: Transaction,
    signers?: Signer[],
    confirmOptions?: ConfirmOptions
  ): Promise<TransactionSignature>;
}
