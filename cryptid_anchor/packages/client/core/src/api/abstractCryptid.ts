import { Wallet } from '../types/crypto';
import {ConfirmOptions, PublicKey, Transaction, TransactionSignature} from '@solana/web3.js';
import { Cryptid, CryptidOptions, DEFAULT_CRYPTID_OPTIONS } from './cryptid';
import { DIDDocument } from 'did-resolver';
import {DidSolIdentifier, DidSolService} from '@identity.com/sol-did-client';
import { NonEmptyArray } from '../types/lang';
import {didService} from "../lib/did";
import {CryptidService} from "../service/cryptid";
import {CryptidAccount} from "../lib/CryptidAccount";
import {TransactionAccount} from "../types";
import {AnchorProvider} from "@project-serum/anchor";

export abstract class AbstractCryptid implements Cryptid {
  protected options: CryptidOptions;

  protected constructor(readonly did: string, options: CryptidOptions) {
    // combine default options and user-specified options
    // note - if nested options are added, this may need to be changed to a deep merge
    this.options = {
      ...DEFAULT_CRYPTID_OPTIONS,
      ...options,
    };
  }

  abstract as(did: string): Cryptid;

  document(): Promise<DIDDocument> {
    return this.didClient().then(client => client.resolve());
  }

  protected async service(): Promise<CryptidService> {
    const account = await CryptidAccount.build(this.did, this.options.accountIndex)
    return new CryptidService(this.wallet, account, this.options.connection, this.options.confirmOptions);
  }

  async address(): Promise<PublicKey> {
    return CryptidAccount.build(this.did, this.options.accountIndex).then(account => account.address);
  }

  async sign(transaction: Transaction): Promise<Transaction> {
    const cryptidService = await this.service();
    const cryptidTx = await cryptidService.directExecute(transaction);
    // TODO why do we need this, if we are adding the wallet to the anchor provider?
    // Anchor should be signing the transaction for us already
    cryptidTx.recentBlockhash = await this.options.connection.getLatestBlockhash().then(blockhash => blockhash.blockhash);
    cryptidTx.feePayer = this.wallet.publicKey;
    return this.wallet.signTransaction(cryptidTx);
  }

  async signLarge(transaction: Transaction): Promise<{
    setupTransactions: NonEmptyArray<Transaction>;
    executeTransaction: Transaction;
  }> {
    const service = await this.service();

    const [proposeTransaction, transactionAccountAddress] = await service.propose(transaction);
    // TODO fix - broken because it tries to load transactionAccountAddress
    const executeTransaction = await service.execute(transactionAccountAddress);

    return {
        setupTransactions: [proposeTransaction],
        executeTransaction
    }
  }

  async propose(transaction: Transaction): Promise<[Transaction, PublicKey]> {
    return this.service()
        .then(service => service.propose(transaction))
  }

  async execute(transactionAccountAddress: PublicKey): Promise<Transaction[]> {
    return this.service()
        .then(service => service.execute(transactionAccountAddress))
        .then(transaction => [transaction])
  }

  // TODO reinstate
  // abstract cancelLarge(transactionAccount: PublicKey): Promise<string>;

  /**
   * Send a signed transaction, and optionally wait for it to be confirmed.
   * This is private as it is intended as a utility function for internal
   * operations, such as addKey, addController etc. It contains no
   * cryptid-specific functionality so is not appropriate to expose to the interface itself
   * @param transaction
   * @param confirmOptions
   * @private
   */
  async send(
    transaction: Transaction,
    confirmOptions: ConfirmOptions = {}
  ): Promise<TransactionSignature> {
    console.log("Signatures")
    transaction.signatures.map((sig) => {
      console.log(`Signature: ${sig.signature?.toString('base64')}`);
      console.log(`Pubkey: ${sig.publicKey.toString()}`);
    });
    // This cast is ok, as it is created as an AnchorProvider in the service constructor
    const service = await this.service();
    const connection = service.program.provider.connection;
    const txSig = await connection.sendRawTransaction(transaction.serialize(), confirmOptions);
    //(service.program.provider as AnchorProvider).sendAndConfirm(transaction, [], confirmOptions));
    const blockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature: txSig, ...blockhash });

    return txSig
  }

  /**
   * Returns this cryptid object as a Wallet, i.e. an object with a sign function and a public key
   * that can be used when sending arbitrary transactions
   * @private
   */
  protected async asWallet(): Promise<Wallet> {
    const publicKey = await this.address();
    return {
      publicKey,
      signTransaction: (transaction: Transaction) => this.sign(transaction),
      signAllTransactions: (transactions: Transaction[]) => Promise.all(transactions.map((t) => this.sign(t))),
    };
  }

  abstract get wallet(): Wallet;

  protected async getSignerForInternalTransaction(): Promise<Wallet> {
    switch (this.options.rentPayer) {
      // use Cryptid to sign and send the tx, so that any rent is paid by the cryptid account
      case 'DID_PAYS':
        return this.asWallet();
      // use the signer key to sign and send the tx, so that any rent is paid by the signer key
      case 'SIGNER_PAYS':
        return this.wallet;
      default:
        throw new Error(`Unsupported payer option: ${this.options.rentPayer}`);
    }
  }

  protected async didClient(): Promise<DidSolService> {
    const identifier = DidSolIdentifier.parse(this.did);
    return didService(identifier, this.options.connection, this.wallet);
  }

  // Base case for collecting all additional keys that must be provided when signing
  // a transaction with controller chains. Each controller layer adds an additional key here
  async additionalKeys(): Promise<PublicKey[]> {
    return [];
  }

  async listPendingTx(): Promise<[PublicKey, TransactionAccount][]> {
    return this.service()
        .then(service => service.listPendingTransactions())
  }
}
