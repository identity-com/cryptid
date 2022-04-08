import { AccountMeta, PublicKey, Transaction } from '@solana/web3.js';
import { create } from '../instructions/directExecute';
import { Signer } from '../../../types/crypto';
import { createTransaction, normalizeSigner } from './util';
import { DecentralizedIdentifier } from '@identity.com/sol-did-client';

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
export const directExecute = async (
  unsignedTransaction: Transaction,
  did: string,
  payer: PublicKey,
  signers: SignerArg[],
  cryptidAccount?: PublicKey,
  debug = false
): Promise<Transaction> => {
  const signersNormalized = normalizeSigner(signers);
  const parsedDID = DecentralizedIdentifier.parse(did);
  const didPDAKey = await parsedDID.pdaSolanaPubkey();

  const directExecuteInstruction = await create(
    unsignedTransaction,
    didPDAKey,
    signersNormalized,
    cryptidAccount,
    debug
  );
  return createTransaction(
    unsignedTransaction.recentBlockhash,
    directExecuteInstruction,
    payer,
    signersNormalized.map(([signer]) => signer)
  );
};

