import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { LegacyClient } from '@identity.com/sol-did-client' // TODO: remove;
import { Signer } from '../../../../types/crypto';
import { DEFAULT_DID_DOCUMENT_SIZE } from '../../../constants';
import { createTransaction } from '../util';
import { filterNotNil } from '../../../util';

/**
 * Creates a transaction that removes a key to a DID.
 *
 * The key is removed by alias (did url fragment). If the key alias is not present on the DID,
 * an error is thrown.
 */
export const removeKey = async (
  connection: Connection,
  did: string,
  signer: Signer,
  alias: string,
  authority: PublicKey
): Promise<Transaction> => {
  const instruction = await LegacyClient.createRemoveKeyInstruction({
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
