import {
  ConfirmOptions,
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Wallet } from "./crypto";
import { CryptidAccountDetails } from "../lib/CryptidAccountDetails";

export type GenericMiddlewareParams = {
  authority: Wallet;
  connection: Connection;
  opts: ConfirmOptions;
  previousMiddleware?: PublicKey;
};

export type ExecuteMiddlewareParams = GenericMiddlewareParams & {
  // The account representing the middleware state
  middlewareAccount: PublicKey;
  // The account representing the proposed transaction state
  transactionAccount: PublicKey;
  // The cryptid account performing the transaction
  cryptidAccountDetails: CryptidAccountDetails;
};

export interface MiddlewareClient<C extends GenericMiddlewareParams> {
  createMiddleware(params: C): Promise<Transaction>;
  onPropose(params: ExecuteMiddlewareParams): Promise<TransactionInstruction[]>;
  onExecute(params: ExecuteMiddlewareParams): Promise<TransactionInstruction[]>;
}
