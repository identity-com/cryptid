import { Keypair, PublicKey } from '@solana/web3.js';
import { SignCallback, Signer } from '../types/crypto';
import * as u8a from 'uint8arrays';
import { deriveDefaultDOA, deriveDOASigner } from './solana/util';
import { complement, isNil } from 'ramda';
import { NonEmptyArray } from '../types/lang';

const defaultSignCallback =
  (keypair: Keypair): SignCallback =>
  async (transaction) => {
    transaction.partialSign(keypair);
    return transaction;
  };

export const toSigner = (keypair: Keypair): Signer => ({
  publicKey: keypair.publicKey,
  sign: defaultSignCallback(keypair),
});

export const isKeypair = (
  keypairOrSigner: Keypair | Signer
): keypairOrSigner is Keypair => keypairOrSigner instanceof Keypair;
export const normalizeSigner = (keypairOrSigner: Keypair | Signer): Signer =>
  isKeypair(keypairOrSigner) ? toSigner(keypairOrSigner) : keypairOrSigner;

export const bytesToBase58 = (bytes: Uint8Array): string =>
  u8a.toString(bytes, 'base58btc');

export const didToDefaultDOASigner = async (
  did: string
): Promise<PublicKey> => {
  const doa = await deriveDefaultDOA(did);
  const [doaSigner, nonce] = await deriveDOASigner(doa);
  console.log('nonce: ', nonce);
  return doaSigner;
};

export const filterNotNil = <T>(entries: (T | null | undefined)[]): T[] =>
  entries.filter(complement(isNil)) as T[];

export const headNonEmpty = <T>(t: NonEmptyArray<T>): T => t[0];
