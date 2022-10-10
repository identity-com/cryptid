import { Signer, Transaction } from "@solana/web3.js";
import { CryptidTransaction } from "../lib/CryptidTransaction";

export type ProposalResult = {
  proposeTransaction: Transaction;
  transactionAccount: Signer;
  cryptidTransactionRepresentation: CryptidTransaction;
};

export type ProposeExecuteResult = {
  proposeExecuteTransaction: Transaction;
  transactionAccount: Signer;
};

export type ProposeExecuteArrayResult = {
  proposeExecuteTransactions: Transaction[];
  transactionAccount: Signer;
};
