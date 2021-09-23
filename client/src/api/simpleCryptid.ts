import { Signer } from '../types/crypto';
import { PublicKey, Transaction } from '@solana/web3.js';
import { Cryptid, CryptidOptions } from './cryptid';
import { directExecute } from '../lib/solana/transactions/directExecute';
import { addKey as addKeyTransaction } from '../lib/solana/transactions/did/addKey';
import { DIDDocument } from 'did-resolver';
import { resolve } from '@identity.com/sol-did-client';
import {didToDefaultDOASigner, headNonEmpty} from '../lib/util';
import {NonEmptyArray} from "../types/lang";

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

  async sign(transaction: Transaction): Promise<NonEmptyArray<Transaction>> {
    const wrappedTransaction = await directExecute(
      this.options.connection,
      transaction,
      this.did,
      this.signer.publicKey,
      [this.signer]
    );
    return [wrappedTransaction];
  }

  /**
   * Send a signed transaction, and optionally wait for it to be confirmed.
   * This is private as it is intended as a utility function for internal
   * operations, such as addKey, addController etc. It contains no
   * cryptid-specific functionality so is not appropriate to expose to the interface itself
   * @param transaction
   * @private
   */
  private async send(transaction: Transaction):Promise<string> {
    const signature = await this.options.connection.sendRawTransaction(
      transaction.serialize()
    );
    if (this.options.waitForConfirmation)
      await this.options.connection.confirmTransaction(signature);

    return signature;
  }

  /**
   * Returns this cryptid object as a Signer, i.e. an obect with a sign function and a public key
   * that can be used when sending arbitrary transactions
   * @private
   */
  private async asSigner():Promise<Signer> {
    const publicKey = await this.address();
    return {
      publicKey,
      sign: (transaction: Transaction) => this.sign(transaction).then(headNonEmpty)
    }
  }

  async addKey(publicKey: PublicKey, alias: string): Promise<string> {
    // use Cryptid to sign and send the tx, so that rent is paid by the cryptid account
    const payer = await this.address();
    const signers = [await this.asSigner()];

    const transaction = await addKeyTransaction(
      this.options.connection,
      this.did,
      payer,
      publicKey,
      alias,
      signers//[] //     [this.signer]
    );

    // const [cryptidTx] = await this.sign(transaction);

    return this.send(transaction);
  }
}
