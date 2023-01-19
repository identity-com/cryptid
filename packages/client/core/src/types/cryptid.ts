import { AccountMeta, PublicKey, Signer, Transaction } from "@solana/web3.js";
import { CryptidTransaction } from "../lib/CryptidTransaction";

// This should match transaction_state.rs
export enum TransactionState {
  NotReady,
  Ready,
  Executed,
}
// use namespace to add toBorsh to the above enum
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TransactionState {
  export function toBorsh(state: TransactionState): { [k in string]: unknown } {
    // Replace the first character to lowercase and return an object with that value as the key
    const key = TransactionState[state].replace(/^\w/, (c) => c.toLowerCase());
    return { [key]: {} };
  }
}

export type ProposalResult = {
  proposeTransaction: Transaction;
  transactionAccount: PublicKey;
  proposeSigners: Signer[];
  cryptidTransactionRepresentation: CryptidTransaction;
};

export type TransactionResult = {
  transaction: Transaction;
  signers: Signer[];
};

export type TransactionArrayResult = {
  transactions: Transaction[];
  signers: Signer[];
};

export type ControllerAccountMetaInfo = [
  AccountMeta[],
  ControllerAccountReference[]
];

// An informative type, indicating that the number
// should represent an index in the TransactionAccount's
// array of accounts
export type AccountIndex = number;
// A type representing a controller in a controller chain in a TransactionAccount
// The account index is the index of the controller in the TransactionAccount's
// array of accounts.
// The public key is the authority_key of the controller DID.
// The latter is needed in order to derive a did account in the generative case.
export type ControllerAccountReference = {
  accountIndex: AccountIndex;
  authorityKey: PublicKey;
};

// A type representing a controller's DID account and DID authority.
export type ControllerPubkeys = [PublicKey, PublicKey];
