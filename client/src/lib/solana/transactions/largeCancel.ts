import {
  AccountMeta,
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { Signer } from '../../../types/crypto';
import { createTransaction, normalizeSigner } from './util';
import { DidSolIdentifier } from '@identity.com/sol-did-client';
import { create as createCancel } from '../instructions/cancelTransaction';

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

export const largeCancel = async (
  connection: Connection,
  transactionAccount: PublicKey,
  did: string,
  payer: PublicKey,
  signers: SignerArg[],
  cryptidAccount?: PublicKey
): Promise<Transaction> => {
  const signersNormalized = normalizeSigner(signers);
  const parsedDID = DidSolIdentifier.parse(did);
  const [didPDAKey] = await parsedDID.dataAccount();

  // Build execute Transaction.
  const execute = await createCancel(
    didPDAKey,
    transactionAccount,
    signersNormalized[0], // TODO: Check in with Brett
    cryptidAccount,
    'cryptid'
  );

  const { blockhash } = await connection.getRecentBlockhash();

  return createTransaction(
    blockhash,
    [execute],
    payer,
    signersNormalized.map(([signer]) => signer)
  );
};
