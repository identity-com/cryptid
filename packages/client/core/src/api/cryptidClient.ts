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
import { ProposalResult, TransactionAccount, TransactionState } from "../types";
import { CryptidAccountDetails } from "../lib/CryptidAccountDetails";
import { Middleware } from "../lib/Middleware";
import { ExecuteArrayResult, SealResult } from "../types/cryptid";
import { CryptidTransaction } from "../lib/CryptidTransaction";

export type PayerOption = "DID_PAYS" | "SIGNER_PAYS";
export type CryptidOptions = {
  // The index of the cryptid account - default 0
  // Cryptid allows multiple accounts per DID, all derivable via an index field.
  accountIndex?: number;
  connection: Connection;
  confirmOptions?: ConfirmOptions;
  waitForConfirmation?: boolean;
  rentPayer?: PayerOption;
};
export type CreateOptions = CryptidOptions & {
  // The chain of controllers, from the top (inclusive), to the one that owns the cryptid account (exclusive)
  // For example, if did:sol:alice controls did:sol:bob which controls did:sol:carol,
  // If alice is creating a cryptid account for carol, the controller chain is [did:sol:alice, did:sol:bob]
  controllerChain?: string[];
};
export type FindAllOptions = {
  connection: Connection;
};
export type BuildOptions = CryptidOptions & {
  middlewares?: Middleware[];
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
 * 2. propose / execute: Two separate calls, middleware is typically executed as part of the execute call.
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
   * The options used when sending transactions with this cryptid account
   */
  readonly options: CryptidOptions;

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

  /**
   * Propose a transaction for execution by cryptid.
   * @param transaction The transaction to propose
   * @param state [TransactionState.Ready] The state to propose the transaction in. If NotReady, the transaction can be extended.
   */
  propose(
    transaction: Transaction,
    state?: TransactionState
  ): Promise<ProposalResult>;

  /**
   * Extend an existing cryptid transaction proposal by adding a transaction to it.
   *
   * The transaction must have previously been proposed in "NotReady" state.
   *
   * Any authority on the cryptid account can extend the transaction.
   *
   * @param transactionAccountAddress The account representing the cryptid transaction proposal to extend
   * @param transaction The transaction to add
   */
  extend(
    transactionAccountAddress: PublicKey,
    transaction: Transaction
  ): Promise<Transaction>;

  /**
   * Seal a proposed transaction so that it can be executed.
   *
   * A sealed transaction can no longer be extended.
   * @param transactionAccountAddress The account representing the cryptid transaction proposal to seal
   */
  seal(transactionAccountAddress: PublicKey): Promise<SealResult>;

  /**
   * Execute a proposed transaction.
   *
   * The transaction must be in "Ready" state.
   * @param transactionAccountAddress
   * @param cryptidTransactionRepresentation
   */
  execute(
    transactionAccountAddress: PublicKey,
    cryptidTransactionRepresentation?: CryptidTransaction
  ): Promise<ExecuteArrayResult>;

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
   * Allows the current Cryptid instance to be controlled by another DID
   * A new Cryptid instance is returned.
   * @param did The DID of the account to sign on behalf of.
   */
  controlWith(did: string): CryptidClient;

  makeControllerChain(): string[];

  additionalKeys(): Promise<PublicKey[]>;

  send(
    transaction: Transaction,
    signers?: Signer[],
    confirmOptions?: ConfirmOptions
  ): Promise<TransactionSignature>;
}
