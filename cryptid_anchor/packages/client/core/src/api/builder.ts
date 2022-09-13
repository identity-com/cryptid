import { Cryptid, CryptidOptions } from './cryptid';
import { Wallet } from '../types/crypto';
import { Keypair } from '@solana/web3.js';
import { SimpleCryptid } from './simpleCryptid';
import { normalizeSigner } from "../lib/crypto";

export class Builder {
  static build(
    did: string,
    signer: Keypair | Wallet,
    options: CryptidOptions
  ): Cryptid {
    return new SimpleCryptid(did, normalizeSigner(signer), options);
  }
}
