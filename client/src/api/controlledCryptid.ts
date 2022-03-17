import { PublicKey, Transaction } from '@solana/web3.js';
import { Cryptid, CryptidOptions } from './cryptid';
import { directExecute } from '../lib/solana/transactions/directExecute';
import { AbstractCryptid } from './abstractCryptid';
import { didToPDA } from '../lib/solana/util';
import { Signer } from '../types/crypto';
import { checkTxSize } from '../lib/util';
import { NonEmptyArray } from "../types/lang";

export class ControlledCryptid extends AbstractCryptid {
  /**
   * Create a controlled cryptid account. Controlled by the controllerCryptid
   *
   * A controlled cryptid has no key - the key is provided by the controller
   * @param controlledDid
   * @param controllerCryptid
   * @param options
   */
  constructor(
    controlledDid: string,
    private controllerCryptid: Cryptid,
    options: CryptidOptions
  ) {
    super(controlledDid, options);
  }

  get signer(): Signer {
    return this.controllerCryptid.signer;
  }

  as(controlledDid: string): ControlledCryptid {
    return new ControlledCryptid(controlledDid, this, this.options);
  }

  async additionalKeys(): Promise<PublicKey[]> {
    const additionalKey = await didToPDA(this.controllerCryptid.did);
    const controllerAdditionalKeys =
      await this.controllerCryptid.additionalKeys();

    return [...controllerAdditionalKeys, additionalKey];
  }

  async sign(transaction: Transaction): Promise<Transaction> {
    try {
      const additionalSigners = await this.additionalKeys();
      const wrappedTransaction = await directExecute(
        transaction,
        this.did,
        this.signer.publicKey,
        [[this.signer, additionalSigners]]
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

  async signLarge(transaction: Transaction): Promise<{
    setupTransactions: NonEmptyArray<Transaction>;
    executeTransaction: Transaction;
  }> {
    // TODO: implement

    return {
      setupTransactions: [ transaction],
      executeTransaction: transaction,
    };
  }

  updateSigner(signer: Signer): void {
    // TODO: or should we rather throw here? (e.g. don't update signers on controlled instances?
    this.controllerCryptid.updateSigner(signer);
  }
}
