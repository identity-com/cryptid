import { AccountMeta, PublicKey, Signer, Transaction } from "@solana/web3.js";
import { CryptidTransaction } from "../lib/CryptidTransaction";

export type ProposalResult = {
  proposeTransaction: Transaction;
  transactionAccount: PublicKey;
  proposeSigners: Signer[];
  cryptidTransactionRepresentation: CryptidTransaction;
};

export type ExecuteResult = {
  executeTransaction: Transaction;
  executeSigners: Signer[];
};

export type ExecuteArrayResult = {
  executeTransactions: Transaction[];
  executeSigners: Signer[];
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
