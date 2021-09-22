import { Keypair } from '@solana/web3.js';
import { publicKeyToDid } from '../../src/lib/solana/util';

export const makeKeypair = (): Keypair => Keypair.generate();
export const did = (keypair: Keypair = makeKeypair()): string =>
  publicKeyToDid(keypair.publicKey);
