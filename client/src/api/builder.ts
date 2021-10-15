import { Cryptid, CryptidOptions } from './cryptid';
import { Signer } from '../types/crypto';
import { Keypair } from '@solana/web3.js';
import { normalizeSigner } from '../lib/util';
import { SimpleCryptid } from './simpleCryptid';

export class Builder {
  static build(
    did: string,
    signer: Keypair | Signer,
    options: CryptidOptions
  ): Cryptid {
    return new SimpleCryptid(did, normalizeSigner(signer), options);
  }
}
