import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { SignCallback, Signer } from '../types/crypto';
import * as u8a from 'uint8arrays';
import {
  deriveDefaultCryptidAccount,
  deriveCryptidAccountSigner,
} from './solana/util';
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
): keypairOrSigner is Keypair =>
  keypairOrSigner instanceof Keypair ||
  // IDCOM-1340 this clause is added to handle type erasure on compiled TS
  keypairOrSigner.constructor.name === 'Keypair';
export const normalizeSigner = (keypairOrSigner: Keypair | Signer): Signer =>
  isKeypair(keypairOrSigner) ? toSigner(keypairOrSigner) : keypairOrSigner;

export const bytesToBase58 = (bytes: Uint8Array): string =>
  u8a.toString(bytes, 'base58btc');

export const didToDefaultDOASigner = async (
  did: string
): Promise<PublicKey> => {
  const cryptidAccount = await deriveDefaultCryptidAccount(did);
  const [cryptidAccountSigner] = await deriveCryptidAccountSigner(
    cryptidAccount
  );
  return cryptidAccountSigner;
};

export const filterNotNil = <T>(entries: (T | null | undefined)[]): T[] =>
  entries.filter(complement(isNil)) as T[];

export const headNonEmpty = <T>(t: NonEmptyArray<T>): T => t[0];

export const checkTxSize = (tx: Transaction): void => {
  tx.serialize({ verifySignatures: false, requireAllSignatures: false }); // check for size, do not check fo signers
};

export const isTxValid = (tx: Transaction | undefined): boolean => {
  if (!tx) {
    return false;
  }

  try {
    tx.serialize({ verifySignatures: false, requireAllSignatures: false }); // check for size, do not check fo signers
  } catch (e) {
    // console.log(e)
    return false;
  }
  return true;
};
