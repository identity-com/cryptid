import { Signer } from '../types/crypto';
import { PublicKey, Transaction, TransactionSignature } from '@solana/web3.js';
import { Cryptid, CryptidOptions, DEFAULT_CRYPTID_OPTIONS } from './cryptid';
import { addKey as addKeyTransaction } from '../lib/solana/transactions/did/addKey';
import { removeKey as removeKeyTransaction } from '../lib/solana/transactions/did/removeKey';
import { addService as addServiceTransaction } from '../lib/solana/transactions/did/addService';
import { removeService as removeServiceTransaction } from '../lib/solana/transactions/did/removeService';
import { addController as addControllerTransaction } from '../lib/solana/transactions/did/addController';
import { removeController as removeControllerTransaction } from '../lib/solana/transactions/did/removeController';
import { DIDDocument, ServiceEndpoint } from 'did-resolver';
import { resolve } from '@identity.com/sol-did-client';
import { didToDefaultDOASigner, headNonEmpty } from '../lib/util';
import { NonEmptyArray } from '../types/lang';

export abstract class AbstractCryptid implements Cryptid {
  protected options: CryptidOptions;

  constructor(readonly did: string, options: CryptidOptions) {
    // combine default options and user-specified options
    // note - if nested options are added, this may need to be changed to a deep merge
    this.options = {
      ...DEFAULT_CRYPTID_OPTIONS,
      ...options,
    };
  }

  abstract updateSigner(signer: Signer): void;

  abstract as(did: string): Cryptid;

  document(): Promise<DIDDocument> {
    return resolve(this.did);
  }

  address(): Promise<PublicKey> {
    return didToDefaultDOASigner(this.did);
  }

  abstract sign(transaction: Transaction): Promise<NonEmptyArray<Transaction>>;

  /**
   * Send a signed transaction, and optionally wait for it to be confirmed.
   * This is private as it is intended as a utility function for internal
   * operations, such as addKey, addController etc. It contains no
   * cryptid-specific functionality so is not appropriate to expose to the interface itself
   * @param transaction
   * @private
   */
  private async send(transaction: Transaction): Promise<TransactionSignature> {
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
  protected async asSigner(): Promise<Signer> {
    const publicKey = await this.address();
    return {
      publicKey,
      sign: (transaction: Transaction) =>
        this.sign(transaction).then(headNonEmpty),
    };
  }

  abstract get signer(): Signer;

  protected async getPayerForInternalTransaction(): Promise<Signer> {
    switch (this.options.rentPayer) {
      // use Cryptid to sign and send the tx, so that any rent  is paid by the cryptid account
      case 'DID_PAYS':
        return this.asSigner();
      // use the signer key to sign and send the tx, so that any rent is paid by the signer key
      case 'SIGNER_PAYS':
        return this.signer;
      default:
        throw new Error(`Unsupported payer option: ${this.options.rentPayer}`);
    }
  }

  async addKey(
    publicKey: PublicKey,
    alias: string
  ): Promise<TransactionSignature> {
    const signer = await this.getPayerForInternalTransaction();

    const transaction = await addKeyTransaction(
      this.options.connection,
      this.did,
      signer.publicKey,
      publicKey,
      alias,
      [signer]
    );

    return this.send(transaction);
  }

  async removeKey(alias: string): Promise<TransactionSignature> {
    const signer = await this.getPayerForInternalTransaction();

    const transaction = await removeKeyTransaction(
      this.options.connection,
      this.did,
      signer.publicKey,
      alias,
      [signer]
    );

    return this.send(transaction);
  }

  async addService(service: ServiceEndpoint): Promise<TransactionSignature> {
    const signer = await this.getPayerForInternalTransaction();

    const transaction = await addServiceTransaction(
      this.options.connection,
      this.did,
      signer.publicKey,
      service,
      [signer]
    );

    return this.send(transaction);
  }

  async removeService(alias: string): Promise<TransactionSignature> {
    const signer = await this.getPayerForInternalTransaction();

    const transaction = await removeServiceTransaction(
      this.options.connection,
      this.did,
      signer.publicKey,
      alias,
      [signer]
    );

    return this.send(transaction);
  }

  async addController(controller: string): Promise<TransactionSignature> {
    const signer = await this.getPayerForInternalTransaction();

    const transaction = await addControllerTransaction(
      this.options.connection,
      this.did,
      signer.publicKey,
      controller,
      [signer]
    );

    return this.send(transaction);
  }

  async removeController(controller: string): Promise<TransactionSignature> {
    const signer = await this.getPayerForInternalTransaction();

    const transaction = await removeControllerTransaction(
      this.options.connection,
      this.did,
      signer.publicKey,
      controller,
      [signer]
    );

    return this.send(transaction);
  }

  // Base case for collecting all additional keys that must be provided when signing
  // a transaction with controller chains. Each controller layer adds an additional key here
  async additionalKeys(): Promise<PublicKey[]> {
    return [];
  }
}
