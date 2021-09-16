import { Keypair, PublicKey } from '@solana/web3.js';
import { SignCallback, Signer } from '../types/crypto';
import {
  ClusterType,
  DecentralizedIdentifier,
} from '@identity.com/sol-did-client';
import * as u8a from 'uint8arrays';
import { ExtendedCluster } from '../types/solana';
import { DEFAULT_CLUSTER } from './constants';

const defaultSignCallback = (
  keypair: Keypair
): SignCallback => async transaction => {
  transaction.partialSign(keypair);
  return transaction;
};

export const publicKeyToDid = (
  publicKey: PublicKey,
  cluster?: ExtendedCluster
) =>
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

export const bytesToBase58 = (b: Uint8Array): string =>
  u8a.toString(b, 'base58btc');
