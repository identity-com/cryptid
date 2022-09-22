import { Wallet } from "../types/crypto";
import {
  ConfirmOptions,
  PublicKey,
  Transaction,
  TransactionSignature,
} from "@solana/web3.js";
import {
  CryptidClient,
  CryptidOptions,
  DEFAULT_CRYPTID_OPTIONS,
} from "./cryptidClient";
import { DIDDocument } from "did-resolver";
import { DidSolIdentifier, DidSolService } from "@identity.com/sol-did-client";
import { NonEmptyArray } from "../types/lang";
import { didService } from "../lib/did";
import { CryptidService } from "../service/cryptid";
import { CryptidAccountDetails } from "../lib/CryptidAccountDetails";
import { TransactionAccount } from "../types";

export abstract class AbstractCryptidClient implements CryptidClient {
  protected details: CryptidAccountDetails;
  protected options: CryptidOptions;

  protected constructor(
    details: CryptidAccountDetails,
    options: CryptidOptions
  ) {
    this.details = details;

    // combine default options and user-specified options
    // note - if nested options are added, this may need to be changed to a deep merge
    this.options = {
      ...DEFAULT_CRYPTID_OPTIONS,
      ...options,
    };
  }

  abstract as(did: string): CryptidClient;

  document(): Promise<DIDDocument> {
    return this.didClient().then((client) => client.resolve());
  }

  protected async service(): Promise<CryptidService> {
    return new CryptidService(
      this.wallet,
      this.options.connection,
      this.options.confirmOptions
    );
  }

  get did(): string {
    return this.details.ownerDID;
  }

  address(): PublicKey {
    return this.details.address;
  }

  async sign(transaction: Transaction): Promise<Transaction> {
    const cryptidService = await this.service();
    return cryptidService.directExecute(this.details, transaction);
  }

  async signLarge(transaction: Transaction): Promise<{
    setupTransactions: NonEmptyArray<Transaction>;
    executeTransaction: Transaction;
  }> {
    const service = await this.service();

    const [proposeTransaction, transactionAccountAddress] =
      await service.propose(this.details, transaction);
    // TODO fix - broken because it tries to load transactionAccountAddress
    const executeTransaction = await service.execute(
      this.details,
      transactionAccountAddress
    );

    return {
      setupTransactions: [proposeTransaction],
      executeTransaction,
    };
  }

  async propose(transaction: Transaction): Promise<[Transaction, PublicKey]> {
    return this.service().then((service) =>
      service.propose(this.details, transaction)
    );
  }

  async execute(transactionAccountAddress: PublicKey): Promise<Transaction[]> {
    return this.service()
      .then((service) =>
        service.execute(this.details, transactionAccountAddress)
      )
      .then((transaction) => [transaction]);
  }

  // TODO reinstate
  // abstract cancelLarge(transactionAccount: PublicKey): Promise<string>;

  /**
   * Send a signed transaction, and optionally wait for it to be confirmed.
   * This is a utility function for internal
   * operations, such as addKey, addController etc. It contains no
   * cryptid-specific functionality.
   * @param transaction
   * @param confirmOptions
   * @private
   */
  async send(
    transaction: Transaction,
    confirmOptions: ConfirmOptions = {}
  ): Promise<TransactionSignature> {
    // This cast is ok, as it is created as an AnchorProvider in the service constructor
    const service = await this.service();
    const connection = service.program.provider.connection;
    const txSig = await connection.sendRawTransaction(
      transaction.serialize(),
      confirmOptions
    );
    //(service.program.provider as AnchorProvider).sendAndConfirm(transaction, [], confirmOptions));
    const blockhash = await connection.getLatestBlockhash();
    const result = await connection.confirmTransaction({
      signature: txSig,
      ...blockhash,
    });

    // TODO clean up
    if (result.value.err)
      throw new Error(
        "Transaction failed: " + JSON.stringify(result.value.err)
      );

    return txSig;
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
      signAllTransactions: (transactions: Transaction[]) =>
        Promise.all(transactions.map((t) => this.sign(t))),
    };
  }

  abstract get wallet(): Wallet;

  protected async getSignerForInternalTransaction(): Promise<Wallet> {
    switch (this.options.rentPayer) {
      // use Cryptid to sign and send the tx, so that any rent is paid by the cryptid account
      case "DID_PAYS":
        return this.asWallet();
      // use the signer key to sign and send the tx, so that any rent is paid by the signer key
      case "SIGNER_PAYS":
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
    return this.service().then((service) =>
      service.listPendingTransactions(this.details)
    );
  }
}
