import { PublicKey } from '@solana/web3.js';
import { VerificationMethod } from 'did-resolver';

export const makeVerificationMethod = (
  did: string,
  key: PublicKey,
  alias: string
): VerificationMethod => ({
  id: `${did}#${alias}`,
  publicKeyBase58: key.toBase58(),
  type: 'Ed25519VerificationKey2018',
  controller: did,
});
