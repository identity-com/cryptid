import { AccountMeta, PublicKey, Transaction } from "@solana/web3.js";
import { Signer } from "../../../types/crypto";
import { NonEmptyArray } from "../../../types/lang";
import {
  collectAccountMetas,
  createTransaction,
  mapTransactionInstructionsToAccountArray,
  normalizeSigner
} from "./util";
import { DecentralizedIdentifier } from "@identity.com/sol-did-client";
import { create as createPropose } from "../instructions/proposeTransaction";
import { create as createExecute } from "../instructions/executeTransaction";

import { isCorrectSize } from "../../util";
import { create as createExpand } from "../instructions/expandTransaction";
import InstructionOperation from "../model/InstructionOperation";

/**
 * Optional extra keys for a signer
 */
export type SignerExtra = PublicKey | AccountMeta;
/**
 * A signer passed to `directExecute`
 */
export type SignerArg = Signer | [Signer, SignerExtra[]];

/**
 * Creates a Direct_Execute transaction, that signs and sends a transaction from a DID
 */
const ACCOUNT_SIZE = 10_000;
const TRANSACTION_SEED = 'transaction'; // TODO: Change!

export const largeExecute = async (
  unsignedTransaction: Transaction,
  did: string,
  payer: PublicKey,
  signers: SignerArg[],
  cryptidAccount?: PublicKey,
): Promise<{
  setupTransactions: NonEmptyArray<Transaction>;
  executeTransaction: Transaction;
}> => {
  const signersNormalized = normalizeSigner(signers);
  const parsedDID = DecentralizedIdentifier.parse(did);
  const didPDAKey = await parsedDID.pdaSolanaPubkey();

  // collect all accounts
  const mappedAccountMetas = collectAccountMetas(unsignedTransaction.instructions);
  const mappedAccounts = mappedAccountMetas.map(meta => meta.pubkey);
  const mappedInstructions = mapTransactionInstructionsToAccountArray(
    mappedAccounts,
    unsignedTransaction.instructions
  );

  // initial out-of-bound value.
  let nrOfOverflowInstructions = -1;

  // Build propose transaction
  let proposeTransaction;
  // check if the transaction is too big
  while (!proposeTransaction) {
    nrOfOverflowInstructions++;
    const mappedProposeInstructions = mappedInstructions.slice(0, mappedInstructions.length - nrOfOverflowInstructions);
    const proposeInstruction = await createPropose(
      mappedAccounts,
      mappedProposeInstructions,
      didPDAKey,
      'cryptid',
      TRANSACTION_SEED,
      signersNormalized,
      nrOfOverflowInstructions <= 0,
      cryptidAccount,
      { accountSize: ACCOUNT_SIZE }
    );

    const sizeTx = new Transaction({
      recentBlockhash: unsignedTransaction.recentBlockhash,
      feePayer: unsignedTransaction.feePayer,
    }).add(proposeInstruction);

    if (isCorrectSize(sizeTx, 1)) {
      proposeTransaction = await createTransaction(
        unsignedTransaction.recentBlockhash,
        [proposeInstruction],
        payer,
        signersNormalized.map(([signer]) => signer)
      );
    }
  }
  // After the loop, proposeTransaction is valid
  const setupTransactions: NonEmptyArray<Transaction> = [ proposeTransaction as Transaction ];

  // (Possible) Expand transaction
  let mappedOverheadInstructions = mappedInstructions.slice(mappedInstructions.length - nrOfOverflowInstructions);

  // We assume that overhead instructions will always fit in one single expand
  if (nrOfOverflowInstructions > 0) {
    const expandInstruction = await createExpand(
      [],
      mappedOverheadInstructions.map(instruction => new InstructionOperation({
        push: instruction
      })),
      didPDAKey,
      TRANSACTION_SEED,
      true,
      signersNormalized[0], // TODO: Brett why is this not array? (as with propose). e.g. signers
      cryptidAccount
    );

    const expandTransaction = await createTransaction(
      unsignedTransaction.recentBlockhash,
      [expandInstruction],
      payer,
      signersNormalized.map(([signer]) => signer)
    );

    setupTransactions.push(expandTransaction)
  }

  // Build execute Transaction.
  const execute = await createExecute(
    didPDAKey,
    TRANSACTION_SEED,
    signersNormalized[0], // TODO: Check in with Brett
    mappedAccountMetas,
    cryptidAccount,
    'cryptid',
  );

  const executeTransaction = await createTransaction(
    unsignedTransaction.recentBlockhash,
    [execute],
    payer,
    signersNormalized.map(([signer]) => signer)
  );

  return {
    setupTransactions,
    executeTransaction
  }

}
