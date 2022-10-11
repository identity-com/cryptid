import { PublicKey, Signer, Transaction } from "@solana/web3.js";
import { CryptidTransaction } from "../lib/CryptidTransaction";

export type ProposalResult = {
  proposeTransaction: Transaction;
  transactionAccount: PublicKey;
  signers: Signer[];
  cryptidTransactionRepresentation: CryptidTransaction;
};

export type ProposeExecuteResult = {
  proposeExecuteTransaction: Transaction;
  signers: Signer[];
};

export type ProposeExecuteArrayResult = {
  proposeExecuteTransactions: Transaction[];
  signers: Signer[];
};
