import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Signer } from '../../../../types/crypto';
import { createAddControllerInstruction } from '@identity.com/sol-did-client';
import { DEFAULT_DID_DOCUMENT_SIZE } from '../../../constants';
import { createTransaction } from '../util';
import { filterNotNil } from '../../../util';

/**
 * Creates a transaction that adds a controller to a DID.
 *
 * This transaction will either contain a register instruction (if the DID is not yet registered on chain)
 * or an update instruction (if it is already registered), but not both
 */
export const addController = async (
  connection: Connection,
  did: string,
  signer: Signer,
  controller: string,
  authority: PublicKey
): Promise<Transaction> => {
  const instruction = await createAddControllerInstruction({
    authority,
    did,
    connection,
    controller,
    payer: signer.publicKey,
    size: DEFAULT_DID_DOCUMENT_SIZE,
  });

  const recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

  return await createTransaction(
    recentBlockhash,
    filterNotNil([instruction]),
    signer.publicKey,
    [signer]
  );
};
