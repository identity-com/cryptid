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

import { isTxValid } from "../../util";
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
  debug = false
): Promise<{
  setupTransactions: NonEmptyArray<Transaction>;
  executeTransaction: Transaction;
}> => {
  const signersNormalized = normalizeSigner(signers);
  const parsedDID = DecentralizedIdentifier.parse(did);
  const didPDAKey = await parsedDID.pdaSolanaPubkey();

  if (debug) {
    console.log(`DID PDA Key: ${didPDAKey}`);
  }

  // TODO: This heuristic does not consider accounts running over TX_SIZE
  // collect all accounts
  const mappedAccountMetas = collectAccountMetas(unsignedTransaction.instructions);
  const mappedAccounts = mappedAccountMetas.map(meta => meta.pubkey);
  const mappedInstructions = mapTransactionInstructionsToAccountArray(
    mappedAccounts,
    unsignedTransaction.instructions
  );
  console.log("Number of accounts:", mappedAccounts.length);
  console.log("Number of instructions:", mappedInstructions.length);


  // initial out-of-bound value.
  let nrOfOverflowInstructions = -1;

  // Build propose transaction
  let proposeTransaction;
  // check if the transaction is too big
  while (!isTxValid(proposeTransaction)) {
    nrOfOverflowInstructions++;
    const mappedProposeInstructions = mappedInstructions.slice(0, mappedInstructions.length - nrOfOverflowInstructions);
    try {
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

      proposeTransaction = await createTransaction(
        unsignedTransaction.recentBlockhash,
        [proposeInstruction],
        payer,
        signersNormalized.map(([signer]) => signer)
      );
    } catch (e) {
      // catches Range errors during signing
      continue; // if code is added below
    }
    // console.log("nrOfOverflowInstructions", nrOfOverflowInstructions);
  }
  // After the loop, proposeTransaction is valid
  const setupTransactions: NonEmptyArray<Transaction> = [ proposeTransaction as Transaction ];

  // EXPAND (X-Times) // Add Data
  let mappedOverheadInstructions = mappedInstructions.slice(mappedInstructions.length - nrOfOverflowInstructions);
  // console.log("mappedOverheadInstructions: ", mappedOverheadInstructions.length);
  // Build expand transaction (if needed)

  // We assume that overhead instructions will always fit in one single expand
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

  // EXECUTE.
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