import { Signer } from '../types/crypto';
import { PublicKey, Transaction } from '@solana/web3.js';
import { Cryptid, CryptidOptions } from './cryptid';
import { directExecute } from '../lib/solana/transactions/directExecute';
import { addKey as addKeyTransaction } from '../lib/solana/transactions/did/addKey';
import { DIDDocument } from 'did-resolver';
import { resolve } from '@identity.com/sol-did-client';
import { didToDefaultDOASigner } from '../lib/util';

export class SimpleCryptid implements Cryptid {
  constructor(
    private did: string,
    private signer: Signer,
    private options: CryptidOptions
  ) {}

  document(): Promise<DIDDocument> {
    return resolve(this.did);
  }

  address(): Promise<PublicKey> {
    return didToDefaultDOASigner(this.did);
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
    // use Cryptid to sign and send the tx, so that rent is paid by the cryptid account
    const cryptidAddress = await this.address();

    const transaction = await addKeyTransaction(
      this.options.connection,
      this.did,
      cryptidAddress,
      publicKey,
      alias,
      [] //     [this.signer]
    );

    const [cryptidTx] = await this.sign(transaction);

    const signature = await this.options.connection.sendRawTransaction(
      cryptidTx.serialize()
    );
    if (this.options.waitForConfirmation)
      await this.options.connection.confirmTransaction(signature);

    return signature;
  }
}
