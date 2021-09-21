import { Signer } from '../types/crypto';
import { Transaction } from '@solana/web3.js';
import { Cryptid, CryptidOptions } from './cryptid';
import { directExecute } from '../lib/solana/transactions/directExecute';

export class SimpleCryptid implements Cryptid {
  constructor(
    readonly did: string,
    private signer: Signer,
    private options: CryptidOptions
  ) {}

  async sign(transaction: Transaction): Promise<Transaction[]> {
    const wrappedTransaction = await directExecute(
      this.options.connection,
      transaction,
      this.did,
      [this.signer]
    );
    return [wrappedTransaction];
  }
}
