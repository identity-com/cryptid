import { Wallet } from "../types/crypto";
import {
  ConfirmOptions,
  PublicKey,
  Signer,
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
import { didService } from "../lib/did";
import { CryptidService } from "../service/cryptid";
import { CryptidAccountDetails } from "../lib/CryptidAccountDetails";
import { TransactionAccount } from "../types";
import { ProposalResult, ProposeExecuteArrayResult } from "../types/cryptid";
import { translateError } from "@project-serum/anchor";

export abstract class AbstractCryptidClient implements CryptidClient {
  readonly details: CryptidAccountDetails;
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

  async directExecute(transaction: Transaction): Promise<Transaction> {
    const cryptidService = await this.service();
    return cryptidService.directExecute(this.details, transaction);
  }

  async proposeAndExecute(
    transaction: Transaction,
    forceSingleTx = false
  ): Promise<ProposeExecuteArrayResult> {
    const service = await this.service();

    // TODO this is likely temporary - we should not force the client to have to know whether
    // the tx can fit into a single cryptid transaction or not.
    if (forceSingleTx) {
      const proposeExecuteTransaction =
        await service.proposeAndExecuteTransaction(this.details, transaction);
      return {
        proposeExecuteTransactions: [
          proposeExecuteTransaction.proposeExecuteTransaction,
        ],
        signers: proposeExecuteTransaction.signers,
      };
    }

    const proposalResult = await service.propose(this.details, transaction);
    const executeTransaction = await service.execute(
      this.details,
      proposalResult.transactionAccount,
      proposalResult.cryptidTransactionRepresentation
    );

    return {
      proposeExecuteTransactions: [
        proposalResult.proposeTransaction,
        executeTransaction,
      ],
      signers: proposalResult.signers,
    };
  }

  async propose(transaction: Transaction): Promise<ProposalResult> {
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
   * @param transaction The transaction to send
   * @param signers All signers that should sign the transaction
   * @param confirmOptions Options for waiting for confirmation
   * @private
   */
  async send(
    transaction: Transaction,
    signers?: Signer[],
    confirmOptions?: ConfirmOptions
  ): Promise<TransactionSignature> {
    const service = await this.service();
    try {
      return await service.provider.sendAndConfirm(
        transaction,
        signers,
        confirmOptions
      );
    } catch (err) {
      throw translateError(err, service.idlErrors);
    }
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
      signTransaction: (transaction: Transaction) =>
        this.directExecute(transaction),
      signAllTransactions: (transactions: Transaction[]) =>
        Promise.all(transactions.map((t) => this.directExecute(t))),
    };
  }

  abstract get wallet(): Wallet;

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
