import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { LegacyClient } from '@identity.com/sol-did-client'; // TODO: remove
import { Signer } from '../../../../types/crypto';
import { createTransaction } from '../util';
import { filterNotNil } from '../../../util';
import { DEFAULT_DID_DOCUMENT_SIZE } from '../../../constants';

/**
 * Creates a transaction that adds a key to a DID.
 *
 * This transaction will either contain a register instruction (if the DID is not yet registered on chain)
 * or an update instruction (if it is already registered), but not both
 */
export const addKey = async (
  connection: Connection,
  did: string,
  signer: Signer,
  newKey: PublicKey,
  alias: string,
  authority: PublicKey
): Promise<Transaction> => {
  const instruction = await LegacyClient.createAddKeyInstruction({
    authority,
    did,
    key: newKey,
    fragment: alias,
    connection,
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
