import { PublicKey } from '@solana/web3.js';
import {
  DEFAULT_CLUSTER,
  DOA_PROGRAM_ID,
  SOL_DID_PROGRAM_ID,
} from '../constants';
import { ExtendedCluster } from '../../types/solana';
import {
  ClusterType,
  DecentralizedIdentifier,
} from '@identity.com/sol-did-client';

const DOA_SEED = 'cryptid_doa';
const DOA_SIGNER_SEED = 'doa_signer';

export const publicKeyToDid = (
  publicKey: PublicKey,
  cluster?: ExtendedCluster
): string =>
  DecentralizedIdentifier.create(
    publicKey,
    ClusterType.parse(cluster || DEFAULT_CLUSTER)
  ).toString();

export const didToPDAPublicKey = async (did: string): Promise<PublicKey> =>
  DecentralizedIdentifier.parse(did).pdaSolanaPubkey();

export const deriveDefaultDOA = async (did: string): Promise<PublicKey> => {
  const didPDAKey = await didToPDAPublicKey(did);
  const publicKeyNonce = await PublicKey.findProgramAddress(
    [
      SOL_DID_PROGRAM_ID.toBuffer(),
      didPDAKey.toBuffer(),
      Buffer.from(DOA_SEED, 'utf8'),
    ],
    DOA_PROGRAM_ID
  );
  return publicKeyNonce[0];
};

export const deriveDOASigner = async (
  doa: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [Buffer.from(DOA_SIGNER_SEED, 'utf8'), doa.toBuffer()],
    DOA_PROGRAM_ID
  );
};
