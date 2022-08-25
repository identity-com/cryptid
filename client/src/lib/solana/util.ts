import { PublicKey } from '@solana/web3.js';
import {
  DEFAULT_CLUSTER,
  CRYPTID_PROGRAM_ID,
  SOL_DID_PROGRAM_ID,
} from '../constants';
import { ExtendedCluster } from '../../types/solana';
import {
  DidSolIdentifier,
} from '@identity.com/sol-did-client';

export const DOA_SEED = 'cryptid_doa';
export const DOA_SIGNER_SEED = 'cryptid_signer';
export const TRANSACTION_SEED = 'cryptid_transaction';

export const publicKeyToDid = (
  publicKey: PublicKey,
  cluster?: ExtendedCluster
): string =>
  DidSolIdentifier.create(
    publicKey,
    cluster || DEFAULT_CLUSTER
  ).toString();

/**
 * Given a key representing either a DID or a DID's PDA
 * derive the default CryptidAccount
 * @param didPDAKey the key to the didPDA
 */
export const deriveDefaultCryptidAccountFromKey = async (
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
  DidSolIdentifier.parse(did).authority;

export const didToPDA = (did: string) =>
  DidSolIdentifier.parse(did).dataAccount().then(dataAccount => dataAccount[0]);

export const deriveDefaultCryptidAccount = async (did: string): Promise<PublicKey> => {
  const didKey = await didToPDA(did);
  return deriveDefaultCryptidAccountFromKey(didKey);
};

export const deriveTransactionAccount = async (
  cryptidAccount: PublicKey,
  seed: string
): Promise<PublicKey> => {
  const [key] = await PublicKey.findProgramAddress(
    [
      Buffer.from(TRANSACTION_SEED, 'utf-8'),
      cryptidAccount.toBuffer(),
      Buffer.from(seed, 'utf-8'),
    ],
    CRYPTID_PROGRAM_ID
  );
  return key;
};

export const deriveCryptidAccountSigner = async (
  cryptidAccount: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [Buffer.from(DOA_SIGNER_SEED, 'utf8'), cryptidAccount.toBuffer()],
    CRYPTID_PROGRAM_ID
  );
};
