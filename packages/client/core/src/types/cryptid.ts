import { PublicKey, Transaction } from "@solana/web3.js";
import { CryptidTransaction } from "../lib/CryptidTransaction";

export type ProposalResult = {
  proposeTransaction: Transaction;
  transactionAccountAddress: PublicKey;
  cryptidTransactionRepresentation: CryptidTransaction;
};
