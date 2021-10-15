import { AccountMeta, PublicKey, Transaction } from '@solana/web3.js';
import { create } from '../instructions/directExecute';
import { Signer } from '../../../types/crypto';
import { createTransaction } from './util';
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
  doa?: PublicKey,
  debug = false
): Promise<Transaction> => {
  const signersNormalized: [Signer, AccountMeta[]][] = signers.map((signer) => {
    if (Array.isArray(signer)) {
      return [signer[0], signer[1].map(normalizeExtra)];
    } else {
      return [signer, []];
    }
  });

  const parsedDID = DecentralizedIdentifier.parse(did);
  const didPDAKey = await parsedDID.pdaSolanaPubkey();

  const directExecuteInstruction = await create(
    unsignedTransaction,
    didPDAKey,
    signersNormalized,
    doa,
    debug
  );
  return createTransaction(
    unsignedTransaction.recentBlockhash,
    directExecuteInstruction,
    payer,
    signersNormalized.map(([signer]) => signer)
  );
};

/**
 * Normalizes a `PublicKey | AccountMeta` to an `AccountMeta` where permissions are lowest if it's a `PublicKey`
 * @param key The key or meta to normalize
 */
const normalizeExtra = (key: PublicKey | AccountMeta): AccountMeta => {
  if (key instanceof PublicKey) {
    return {
      pubkey: key,
      isSigner: false,
      isWritable: false,
    };
  } else {
    return key;
  }
};
