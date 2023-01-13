import { PublicKey, Signer, Transaction } from "@solana/web3.js";
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
