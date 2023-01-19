import { CryptidClient, CryptidOptions } from "./cryptidClient";
import { Wallet } from "../types/crypto";
import { CryptidAccountDetails } from "../lib/CryptidAccountDetails";
import { PublicKey, Transaction } from "@solana/web3.js";
import { ProposalResult, TransactionState } from "../types/cryptid";
import { AbstractCryptidClient } from "./abstractCryptidClient";
import { ControlledCryptidClient } from "./controlledCryptidClient";

export class UnauthorizedCryptidClient extends AbstractCryptidClient {
  /**
   * Create an unauthorized cryptid client.
   *
   * An unauthorized cryptid client is one where the authority is not a signer on the DID
   * Unauthorized cryptid clients can only create unauthorized proposals.
   * Unauthorized proposals can only be executed once approved by superuser middleware.
   */
  constructor(
    details: CryptidAccountDetails,
    private _wallet: Wallet,
    options: CryptidOptions
  ) {
    super(details, {
      ...options,
      authorized: false,
    });
  }

  get wallet(): Wallet {
    return this._wallet;
  }

  controlWith(controllerDid: string): CryptidClient {
    return new ControlledCryptidClient(controllerDid, this);
  }

  async propose(
    transaction: Transaction,
    state?: TransactionState
  ): Promise<ProposalResult> {
    return this.service().then((service) =>
      service.propose(this.details, transaction, state, true)
    );
  }

  async extend(
    transactionAccountAddress: PublicKey,
    transaction: Transaction,
    state?: TransactionState
  ): Promise<Transaction> {
    return this.service().then((service) =>
      service.extend(
        this.details,
        transactionAccountAddress,
        transaction,
        state,
        true
      )
    );
  }

  unauthorized(): CryptidClient {
    return this;
  }
}
