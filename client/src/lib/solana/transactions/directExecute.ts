import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { create } from '../instructions/directExecute';
import { Signer } from '../../../types/crypto';

/**
 * Creates a Direct_Execute transaction, that signs and sends a transaction from a DID
 */
export const directExecute = async (
  connection: Connection,
  unsignedTransaction: Transaction,
  did: string,
  signers: Signer[],
  doa?: PublicKey
): Promise<Transaction> => {
  if (signers.length <= 0) throw new Error("DirectExecute must be called with at least one signer.")

  const recentBlockhashPromise = connection.getRecentBlockhash();
  const directExecuteInstruction = await create(
    unsignedTransaction,
    did,
    signers,
    doa
  );
  const { blockhash: recentBlockhash } = await recentBlockhashPromise;

  let transaction = new Transaction({ recentBlockhash, feePayer: signers[0].publicKey }).add(
    directExecuteInstruction
  );

  for (const signer of signers) {
    transaction = await signer.sign(transaction);
  }
  return transaction;
};
