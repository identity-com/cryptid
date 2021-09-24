import {Keypair, PublicKey} from '@solana/web3.js';
import { publicKeyToDid } from '../../src/lib/solana/util';
import {DIDDocument} from "did-resolver";

export const makeKeypair = (): Keypair => Keypair.generate();
export const did = (keypair: Keypair = makeKeypair()): string =>
  publicKeyToDid(keypair.publicKey);

export const didDocument = (key: PublicKey):DIDDocument => ({
  id: 'did:sol:' + key.toString()
});
