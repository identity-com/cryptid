import { Keypair, PublicKey } from '@solana/web3.js';
import { SignCallback, Signer } from '../types/crypto';
import {
  ClusterType,
  DecentralizedIdentifier,
} from '@identity.com/sol-did-client';
import * as u8a from 'uint8arrays';
import { ExtendedCluster } from '../types/solana';
import { DEFAULT_CLUSTER } from './constants';
import { deriveDefaultDOA, deriveDOASigner } from './solana/util';

const defaultSignCallback =
  (keypair: Keypair): SignCallback =>
  async (transaction) => {
    transaction.partialSign(keypair);
    return transaction;
  };

export const publicKeyToDid = (
  publicKey: PublicKey,
  cluster?: ExtendedCluster
): string =>
  DecentralizedIdentifier.create(
    publicKey,
    ClusterType.parse(cluster || DEFAULT_CLUSTER)
  ).toString();

export const didToPublicKey = (did: string): PublicKey =>
  DecentralizedIdentifier.parse(did).pubkey.toPublicKey();

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
  const [doaSigner] = await deriveDOASigner(doa);
  return doaSigner;
};
