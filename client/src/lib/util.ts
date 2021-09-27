import { Keypair, PublicKey } from '@solana/web3.js';
import { DynamicSigner, SignCallback, Signer } from '../types/crypto';
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

export const keypairToDynamicSigner = (keypair: Keypair): DynamicSigner => ({
  publicKey: () => keypair.publicKey,
  sign: defaultSignCallback(keypair),
});

export const staticSignerToDynamicSigner = (
  staticSigner: Signer
): DynamicSigner => ({
  publicKey: () => staticSigner.publicKey,
  sign: staticSigner.sign,
});

export const isKeypair = (
  keypairOrSigner: Keypair | Signer | DynamicSigner
): keypairOrSigner is Keypair => keypairOrSigner instanceof Keypair;

export const isStaticSigner = (
  signer: Signer | DynamicSigner
): signer is Signer => signer.publicKey instanceof PublicKey;

export const normalizeSigner = (
  keypairOrSigner: Keypair | Signer | DynamicSigner
): DynamicSigner =>
  isKeypair(keypairOrSigner)
    ? keypairToDynamicSigner(keypairOrSigner)
    : isStaticSigner(keypairOrSigner)
    ? staticSignerToDynamicSigner(keypairOrSigner)
    : keypairOrSigner;

export const bytesToBase58 = (bytes: Uint8Array): string =>
  u8a.toString(bytes, 'base58btc');

export const didToDefaultDOASigner = async (
  did: string
): Promise<PublicKey> => {
  const doa = await deriveDefaultDOA(did);
  const [doaSigner] = await deriveDOASigner(doa);
  return doaSigner;
};

export const filterNotNil = <T>(entries: (T | null | undefined)[]): T[] =>
  entries.filter(complement(isNil)) as T[];

export const headNonEmpty = <T>(t: NonEmptyArray<T>): T => t[0];
