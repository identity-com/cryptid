import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Signer } from '../../../../types/crypto';
import { ServiceEndpoint } from 'did-resolver';
import { createAddServiceInstruction } from '@identity.com/sol-did-client';
import { DEFAULT_DID_DOCUMENT_SIZE } from '../../../constants';
import { createTransaction } from '../util';
import { filterNotNil } from '../../../util';

/**
 * Creates a transaction that adds a service to a DID.
 *
 * This transaction will either contain a register instruction (if the DID is not yet registered on chain)
 * or an update instruction (if it is already registered), but not both
 */
export const addService = async (
  connection: Connection,
  did: string,
  signer: Signer,
  service: ServiceEndpoint,
  authority: PublicKey
): Promise<Transaction> => {
  const instruction = await createAddServiceInstruction({
    authority,
    did,
    connection,
    service,
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
