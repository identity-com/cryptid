import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Signer } from '../../../../types/crypto';
import { DEFAULT_DID_DOCUMENT_SIZE } from '../../../constants';
import { createTransaction } from '../util';
import { filterNotNil } from '../../../util';
import { createRemoveServiceInstruction } from '@identity.com/sol-did-client';

/**
 * Creates a transaction that removes a service from a DID.
 */
export const removeService = async (
  connection: Connection,
  did: string,
  signer: Signer,
  alias: string,
  authority: PublicKey
): Promise<Transaction> => {
  const instruction = await createRemoveServiceInstruction({
    authority,
    did,
    connection,
    fragment: alias,
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
