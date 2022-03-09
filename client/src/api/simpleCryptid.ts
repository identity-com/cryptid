import { Signer } from '../types/crypto';
import { Transaction } from '@solana/web3.js';
import { CryptidOptions } from './cryptid';
import { directExecute } from '../lib/solana/transactions/directExecute';
import { ControlledCryptid } from './controlledCryptid';
import { AbstractCryptid } from './abstractCryptid';
import { checkTxSize } from '../lib/util';

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

  async sign(transaction: Transaction): Promise<Transaction> {
    try {
      const wrappedTransaction = await directExecute(
        transaction,
        this.did,
        this.signer.publicKey,
        [[this.signer, []]]
      );

      checkTxSize(wrappedTransaction);

      return wrappedTransaction;
    } catch (e) {
      if (e instanceof RangeError) {
        throw new Error(`Transaction is too large.`);
      } else {
        throw e; // another (unhandled) error was thrown
      }
    }
  }

  updateSigner(signer: Signer): void {
    this._signer = signer;
  }
}
