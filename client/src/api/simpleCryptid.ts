import { Signer } from '../types/crypto';
import { PublicKey, Transaction } from '@solana/web3.js';
import { Cryptid, CryptidOptions } from './cryptid';
import { directExecute } from '../lib/solana/transactions/directExecute';
import { addKey as addKeyTransaction } from '../lib/solana/transactions/did/addKey';
import { DIDDocument } from 'did-resolver';
import { resolve } from '@identity.com/sol-did-client';

export class SimpleCryptid implements Cryptid {
  constructor(
    private did: string,
    private signer: Signer,
    private options: CryptidOptions
  ) {}

  document(): Promise<DIDDocument> {
    return resolve(this.did);
  }

  async sign(transaction: Transaction): Promise<Transaction[]> {
    const wrappedTransaction = await directExecute(
      this.options.connection,
      transaction,
      this.did,
      this.signer.publicKey,
      [this.signer]
    );
    return [wrappedTransaction];
  }

  async addKey(publicKey: PublicKey, alias: string): Promise<string> {
    const transaction = await addKeyTransaction(
      this.options.connection,
      this.did,
      this.signer.publicKey,
      publicKey,
      alias,
      [this.signer]
    );

    const signature = await this.options.connection.sendRawTransaction(
      transaction.serialize()
    );
    if (this.options.waitForConfirmation)
      await this.options.connection.confirmTransaction(signature);

    return signature;
  }
}
