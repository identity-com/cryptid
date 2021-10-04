import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { Signer } from '../../../types/crypto';
import {
  createRegisterInstruction,
  DecentralizedIdentifier,
} from '@identity.com/sol-did-client';
import { DEFAULT_DID_DOCUMENT_SIZE, SOL_DID_PROGRAM_ID } from '../../constants';
import { DIDDocument } from 'did-resolver';
import {didToPublicKey} from "../util";

/**
 * Create a new empty transaction, initialised with a fee payer and a recent transaction hash
 * @param recentBlockhash The recentBlockhash to use for the new Transaction.
 * @param payer The fee payer for the transaction
 */
const makeEmptyTransaction = async (
  recentBlockhash: string | undefined,
  payer: PublicKey
) => {
  return new Transaction({ recentBlockhash, feePayer: payer });
};

/**
 * Creates and signs a transaction from an array of instructions
 */
export const createTransaction = async (
  recentBlockhash: string | undefined,
  instructions: TransactionInstruction[],
  payer: PublicKey,
  signers: Signer[]
): Promise<Transaction> => {
  let transaction = await makeEmptyTransaction(recentBlockhash, payer);

  transaction = transaction.add(...instructions);

  for (const signer of signers) {
    transaction = await signer.sign(transaction);
  }
  return transaction;
};

const registerInstruction = async (
  payer: PublicKey,
  authority: PublicKey,
  document?: Partial<DIDDocument>,
  size: number = DEFAULT_DID_DOCUMENT_SIZE
) =>
  createRegisterInstruction({
    payer,
    authority,
    size,
    document,
  });

export const didIsRegistered = async (
  connection: Connection,
  did: string
): Promise<boolean> => {
  const decentralizedIdentifier = DecentralizedIdentifier.parse(did);
  const pda = await decentralizedIdentifier.pdaSolanaPubkey();

  const account = await connection.getAccountInfo(pda);

  if (!account) return false;

  if (account.owner.equals(SOL_DID_PROGRAM_ID)) return true;

  throw new Error(
    `Invalid DID ${did}, the derived account ${pda} is registered to another program`
  );
};

export const registerInstructionIfNeeded = async (
  connection: Connection,
  did: string,
  payer: PublicKey,
  document?: Partial<DIDDocument>,
  size?: number
): Promise<TransactionInstruction | null> => {
  const isRegistered = await didIsRegistered(connection, did);

  if (isRegistered) return null;

  const [instruction] = await registerInstruction(
    payer,
    didToPublicKey(did),
    document,
    size
  );
  return instruction;
};
