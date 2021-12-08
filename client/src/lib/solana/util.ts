import { PublicKey } from '@solana/web3.js';
import {
  DEFAULT_CLUSTER,
  CRYPTID_PROGRAM_ID,
  SOL_DID_PROGRAM_ID,
} from '../constants';
import { ExtendedCluster } from '../../types/solana';
import {
  ClusterType,
  DecentralizedIdentifier,
} from '@identity.com/sol-did-client';

export const DOA_SEED = 'cryptid_doa';
export const DOA_SIGNER_SEED = 'cryptid_signer';

export const publicKeyToDid = (
  publicKey: PublicKey,
  cluster?: ExtendedCluster
): string =>
  DecentralizedIdentifier.create(
    publicKey,
    ClusterType.parse(cluster || DEFAULT_CLUSTER)
  ).toString();

/**
 * Given a key representing either a DID or a DID's PDA
 * derive the default DOA
 * @param didPDAKey the key to the didPDA
 */
export const deriveDefaultDOAFromKey = async (
  didPDAKey: PublicKey
): Promise<PublicKey> => {
  const publicKeyNonce = await PublicKey.findProgramAddress(
    [
      Buffer.from(DOA_SEED, 'utf8'),
      SOL_DID_PROGRAM_ID.toBuffer(),
      didPDAKey.toBuffer(),
    ],
    CRYPTID_PROGRAM_ID
  );
  return publicKeyNonce[0];
};

export const didToPublicKey = (did: string): PublicKey =>
  DecentralizedIdentifier.parse(did).authorityPubkey.toPublicKey();

export const didToPDA = (did: string) =>
  DecentralizedIdentifier.parse(did).pdaSolanaPubkey();

export const deriveDefaultDOA = async (did: string): Promise<PublicKey> => {
  const didKey = await didToPDA(did);
  return deriveDefaultDOAFromKey(didKey);
};

export const deriveDOASigner = async (
  doa: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [Buffer.from(DOA_SIGNER_SEED, 'utf8'), doa.toBuffer()],
    CRYPTID_PROGRAM_ID
  );
};
