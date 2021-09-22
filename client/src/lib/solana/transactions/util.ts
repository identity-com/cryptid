import {Connection, PublicKey, Transaction, TransactionInstruction} from "@solana/web3.js";
import {Signer} from "../../../types/crypto";
import {createRegisterInstruction, DecentralizedIdentifier} from "@identity.com/sol-did-client";
import {DEFAULT_DID_DOCUMENT_SIZE, SOL_DID_PROGRAM_ID} from "../../constants";
import {DIDDocument} from "did-resolver";

/**
 * Create a new empty transaction, initialised with a fee payer and a recent transaction hash
 * @param connection The solana connection object to obtain the recent blockhash from
 * @param signers A sorted list of signers. The first one will be the fee payer for the transaction
 */
export const makeEmptyTransaction = async (connection: Connection, signers: Signer[]) => {
  if (signers.length <= 0) throw new Error("The transaction must be initialised with at least one signer.")
  const recentBlockhashPromise = connection.getRecentBlockhash();
  const { blockhash: recentBlockhash } = await recentBlockhashPromise;

  return new Transaction({ recentBlockhash, feePayer: signers[0].publicKey });
}

/**
 * Creates a Direct_Execute transaction, that signs and sends a transaction from a DID
 */
export const createAndSignTransaction = async (
  connection: Connection,
  instructions: TransactionInstruction[],
  signers: Signer[],
): Promise<Transaction> => {
  let transaction = await makeEmptyTransaction(connection, signers);

  transaction = transaction.add(...instructions);

  for (const signer of signers) {
    transaction = await signer.sign(transaction);
  }
  return transaction;
};

const registerInstruction = async (payer: PublicKey, authority: PublicKey, document?: Partial<DIDDocument>, size: number = DEFAULT_DID_DOCUMENT_SIZE) =>
  createRegisterInstruction({
    payer,
    authority,
    size,
    document
  })

const didIsRegistered = async (connection: Connection, did: string):Promise<boolean> => {
  const decentralizedIdentifier = DecentralizedIdentifier.parse(did);
  const pda = await decentralizedIdentifier.pdaSolanaPubkey();

  const account = await connection.getAccountInfo(pda);

  if (!account) return false;

  if (account.owner.equals(SOL_DID_PROGRAM_ID)) return true;

  throw new Error(`Invalid DID ${did}, the derived account ${pda} is registered to another program`);
}

export const registerInstructionIfNeeded = async (connection: Connection, did: string, signer: Signer, document?: Partial<DIDDocument>, size?: number): Promise<TransactionInstruction|null> => {
  const isRegistered = await didIsRegistered(connection, did);

  if (isRegistered) return null;

  const decentralizedIdentifier = DecentralizedIdentifier.parse(did);
  const [ instruction ] = await registerInstruction(signer.publicKey, decentralizedIdentifier.authorityPubkey.toPublicKey(), document, size);
  return instruction;
};