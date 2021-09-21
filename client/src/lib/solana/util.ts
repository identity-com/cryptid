import { didToPublicKey } from '../util';
import { PublicKey } from '@solana/web3.js';
import { DOA_PROGRAM_ID, SOL_DID_PROGRAM_ID } from '../constants';

const DOA_NONCE = 'cryptid_doa';
const DOA_SIGNER_NONCE = 'doa_signer';

export const deriveDefaultDOA = async (did: string): Promise<PublicKey> => {
  const didKey = didToPublicKey(did);
  const publicKeyNonce = await PublicKey.findProgramAddress(
    [
      SOL_DID_PROGRAM_ID.toBuffer(),
      didKey.toBuffer(),
      Buffer.from(DOA_NONCE, 'utf8'),
    ],
    DOA_PROGRAM_ID
  );
  return publicKeyNonce[0];
};

export const deriveDOASigner = async (
  doa: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [Buffer.from(DOA_SIGNER_NONCE, 'utf8'), doa.toBuffer()],
    DOA_PROGRAM_ID
  );
};
