import { Signer } from '../types/crypto';
import { PublicKey, Transaction, TransactionSignature } from '@solana/web3.js';
import { CryptidOptions } from './cryptid';
import { directExecute } from '../lib/solana/transactions/directExecute';
import { ControlledCryptid } from './controlledCryptid';
import { AbstractCryptid } from './abstractCryptid';
import { NonEmptyArray } from '../types/lang';
import { largeExecute } from '../lib/solana/transactions/largeExecute';
import { largeCancel } from "../lib/solana/transactions/largeCancel";

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
    const wrappedTransaction = await directExecute(
      transaction,
      this.did,
      this.signer.publicKey,
      [[this.signer, []]]
    );

    return wrappedTransaction;
  }

  async signLarge(transaction: Transaction): Promise<{
    setupTransactions: NonEmptyArray<Transaction>;
    executeTransaction: Transaction;
  }> {
    return await largeExecute(transaction, this.did, this.signer.publicKey, [
      [this.signer, []],
    ]);
  }

  async cancelLarge(
    transactionAccount: PublicKey
  ): Promise<TransactionSignature> {
    const transaction = await largeCancel(
      this.options.connection,
      transactionAccount,
      this.did,
      this.signer.publicKey,
      [[this.signer, []]],
    );

    return this.send(transaction);
  }

  updateSigner(signer: Signer): void {
    this._signer = signer;
  }
}
