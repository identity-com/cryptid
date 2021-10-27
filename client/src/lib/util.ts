import nacl from 'tweetnacl';

import { Keypair, PublicKey } from '@solana/web3.js';
import { SignMessageCallback, SignCallback, Signer } from '../types/crypto';
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

export const defaultSignMessageCallback =
  (keypair: Keypair): SignMessageCallback =>
  async (message) => {
    return nacl.sign.detached(message, keypair.secretKey);
  };

export const toSigner = (keypair: Keypair): Signer => ({
  publicKey: keypair.publicKey,
  sign: defaultSignCallback(keypair),
  signMessage: defaultSignMessageCallback(keypair),
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
  const [doaSigner] = await deriveDOASigner(doa);
  return doaSigner;
};

export const filterNotNil = <T>(entries: (T | null | undefined)[]): T[] =>
  entries.filter(complement(isNil)) as T[];

export const headNonEmpty = <T>(t: NonEmptyArray<T>): T => t[0];
