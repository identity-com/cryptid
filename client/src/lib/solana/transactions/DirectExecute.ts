import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { create } from '../instructions/DirectExecute';
import { Signer } from '../../../types/crypto';

/**
 * Creates a Direct_Execute transaction, that signs and sends a transaction from a DID
 */
export const directExecute = async (
  connection: Connection,
  unsignedTransaction: Transaction,
  did: string,
  signer: Signer,
  doa?: PublicKey
): Promise<Transaction> => {
  const recentBlockhashPromise = connection.getRecentBlockhash();
  const directExecuteInstruction = await create(
    unsignedTransaction,
    did,
    signer,
    doa
  );
  const { blockhash: recentBlockhash } = await recentBlockhashPromise;

  const transaction = new Transaction({ recentBlockhash }).add(
    directExecuteInstruction
  );

  return signer.sign(transaction);
};
