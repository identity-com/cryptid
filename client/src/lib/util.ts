import {
  Keypair,
  PACKET_DATA_SIZE,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
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

// taken from https://github.com/solana-labs/solana-web3.js/blob/master/src/util/shortvec-encoding.ts
function encodeLength(bytes: Array<number>, len: number) {
  let rem_len = len;
  for (;;) {
    let elem = rem_len & 0x7f;
    rem_len >>= 7;
    if (rem_len == 0) {
      bytes.push(elem);
      break;
    } else {
      elem |= 0x80;
      bytes.push(elem);
    }
  }
}

const SIGNATURE_LENGTH = 64;
/**
 * Checks if the transaction data and signatures would fit the packet size without signing
 */
export const _isCorrectSize = (
  transaction: Transaction,
  numSigners: number
): boolean => {
  const signData = transaction.serializeMessage();

  const signatureCount: number[] = [];
  encodeLength(signatureCount, numSigners);
  const transactionLength =
    signatureCount.length + numSigners * SIGNATURE_LENGTH + signData.length;

  return transactionLength < PACKET_DATA_SIZE;
};
/**
 * Checks if the transaction data and signatures would fit the packet size without signing
 */
export const isCorrectSize = (
  transaction: Transaction,
  numSigners: number
): boolean => {
  const signData = transaction.serializeMessage();

  const signatureCount: number[] = [];
  encodeLength(signatureCount, numSigners);
  const transactionLength =
    signatureCount.length + numSigners * SIGNATURE_LENGTH + signData.length;

  return transactionLength < PACKET_DATA_SIZE;
};
