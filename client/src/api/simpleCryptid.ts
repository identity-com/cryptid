import { Signer } from '../types/crypto';
import { Transaction } from '@solana/web3.js';
import { CryptidOptions } from './cryptid';
import { directExecute } from '../lib/solana/transactions/directExecute';
import { NonEmptyArray } from '../types/lang';
import { ControlledCryptid } from './controlledCryptid';
import { AbstractCryptid } from './abstractCryptid';

export class SimpleCryptid extends AbstractCryptid {
  constructor(did: string, private _signer: Signer, options: CryptidOptions) {
    super(did, options);
  }

  get signer(): Signer {
    return this._signer;
  }

  as(controlledDid: string): ControlledCryptid {
    return new ControlledCryptid(controlledDid, this, this.options);
  }

  async sign(transaction: Transaction): Promise<NonEmptyArray<Transaction>> {
    const wrappedTransaction = await directExecute(
      transaction,
      this.did,
      this.signer.publicKey,
      [[this.signer, []]]
    );
    return [wrappedTransaction];
  }
}
