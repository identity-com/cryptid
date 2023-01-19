import {
  AccountInfo,
  ConfirmOptions,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { Wallet } from "../types/crypto";
import { AnchorProvider, parseIdlErrors, Program } from "@project-serum/anchor";
import { Cryptid, CryptidIDL } from "@identity.com/cryptid-idl";
import { CRYPTID_PROGRAM } from "../constants";
import {
  CryptidAccount,
  ExecuteMiddlewareParams,
  TransactionAccount,
  TransactionState,
} from "../types";
import { CryptidTransaction } from "../lib/CryptidTransaction";
import { CryptidAccountDetails } from "../lib/CryptidAccountDetails";
import { noSignWallet } from "../lib/crypto";
import { getCryptidAccountAddress, toAccountMeta } from "../lib/cryptid";
import { range } from "ramda";
import { didToPDA, didToPublicKey } from "../lib/did";
import { DID_SOL_PROGRAM } from "@identity.com/sol-did-client";
import { MiddlewareRegistry } from "./middlewareRegistry";
import {
  ControllerPubkeys,
  TransactionResult,
  ProposalResult,
} from "../types/cryptid";
import { MiddlewareResult } from "../types/middleware";

export class CryptidService {
  readonly program: Program<Cryptid>;
  readonly provider: AnchorProvider;
  readonly idlErrors: Map<number, string>;
  private authorityKey: PublicKey;
  private controllerChainPubkeys: ControllerPubkeys[];

  static permissionless(
    connection: Connection,
    opts: ConfirmOptions = {}
  ): CryptidService {
    return new CryptidService(noSignWallet(), connection, opts);
  }

  constructor(
    private authority: Wallet,
    private connection: Connection,
    private opts: ConfirmOptions = {},
    controllerChain: string[] = []
  ) {
    this.provider = new AnchorProvider(connection, authority, opts);
    this.idlErrors = parseIdlErrors(CryptidIDL);

    this.authorityKey = authority.publicKey;

    this.controllerChainPubkeys = controllerChain.map((did) => [
      didToPDA(did)[0], // the did account
      didToPublicKey(did), // the did authority key
    ]);

    this.program = new Program<Cryptid>(
      CryptidIDL,
      CRYPTID_PROGRAM,
      this.provider
    );
  }

  public async loadAccountDetails(
    did: string,
    address: PublicKey,
    cryptidAccount: CryptidAccount
  ): Promise<CryptidAccountDetails> {
    const middlewareAccount =
      cryptidAccount.middleware &&
      (await this.program.provider.connection.getAccountInfo(
        cryptidAccount.middleware
      ));

    // TODO support chaining
    const middleware: [PublicKey, AccountInfo<Buffer>] | undefined =
      middlewareAccount && cryptidAccount.middleware
        ? [cryptidAccount.middleware, middlewareAccount]
        : undefined;

    return CryptidAccountDetails.fromAccounts(
      did,
      address,
      cryptidAccount,
      middleware ? [middleware] : []
    );
  }

  public async findAllAccounts(
    did: string,
    offset = 0,
    page = 20
  ): Promise<CryptidAccountDetails[]> {
    // By convention, the first account is the generative case
    const defaultAccountDetails = CryptidAccountDetails.defaultAccount(did);

    // do not do a lookup for index 0, as it is the default account
    const adaptedOffset = offset === 0 ? offset + 1 : offset;

    const didAccount = didToPDA(did)[0];
    const addresses = range(adaptedOffset, offset + page).map(
      (index) => getCryptidAccountAddress(didAccount, index)[0]
    );

    const rawAccounts = await this.program.account.cryptidAccount.fetchMultiple(
      addresses
    );

    const accountDetails = await Promise.all(
      rawAccounts
        .map((account, index) => [account, addresses[index]])
        .filter((a) => a[0] !== null)
        // https://github.com/coral-xyz/anchor/issues/1580
        .map((a) => a as unknown as [CryptidAccount, PublicKey])
        .map((a) => this.loadAccountDetails(did, a[1], a[0]))
    );

    // if the default account was requested, add it here
    return [
      ...(offset === 0 ? [defaultAccountDetails] : []),
      ...accountDetails,
    ];
  }

  public listPendingTransactions(
    account: CryptidAccountDetails
  ): Promise<[PublicKey, TransactionAccount][]> {
    return this.program.account.transactionAccount
      .all([
        // TODO: Confirm these filters are correct
        { memcmp: { offset: 0, bytes: "1" } },
        { memcmp: { offset: 1, bytes: account.address.toBase58() } },
      ])
      .then((response) =>
        response.map((r) => [
          r.publicKey,
          r.account as unknown as TransactionAccount, // TODO fix cast
        ])
      );
  }

  public async createAccount(details: CryptidAccountDetails): Promise<string> {
    const lastMiddleware =
      details.middlewares.length > 0
        ? details.middlewares[details.middlewares.length - 1]
        : undefined;
    const superuserMiddlewares = details.middlewares
      .filter((m) => m.isSuperuser)
      .map((m) => m.address);
    return (
      this.program.methods
        .createCryptidAccount(
          lastMiddleware?.address || null,
          superuserMiddlewares,
          // Pass in the controller dids (if any)
          this.controllerChainPubkeys.map((c) => c[1]),
          details.index,
          details.didAccountBump
        )
        .accounts({
          cryptidAccount: details.address,
          didProgram: DID_SOL_PROGRAM,
          did: details.didAccount,
          authority: this.authorityKey,
        })
        // Pass in the controller did accounts (if any)
        .remainingAccounts(
          this.controllerChainPubkeys.map((c) => toAccountMeta(c[0]))
        )
        .rpc()
    );
  }

  private async executeMiddlewareInstructions(
    account: CryptidAccountDetails,
    transactionAccount: PublicKey,
    stage: "Propose" | "Execute" | "Close"
  ): Promise<MiddlewareResult> {
    const middlewareContexts =
      MiddlewareRegistry.get().getMiddlewareContexts(account);

    // Parameters passed to each middleware
    const executeParameters: Omit<
      ExecuteMiddlewareParams,
      "middlewareAccount"
    > = {
      authority: (this.program.provider as AnchorProvider).wallet,
      connection: this.connection,
      opts: this.opts,
      transactionAccount,
      cryptidAccountDetails: account,
    };

    // Middlewares may have functions interface functions for propose, execute and close.
    const middlewareFn =
      stage === "Propose"
        ? "onPropose"
        : stage === "Close"
        ? "onClose"
        : "onExecute";

    // For each middleware, execute their onPropose or onExecute function
    const middlewareExecutions = middlewareContexts.map(
      ({ client, accounts }) =>
        client[middlewareFn]({
          ...executeParameters,
          middlewareAccount: accounts.address,
        })
    );

    return Promise.all(middlewareExecutions).then((results) =>
      // Flatten into single MiddlewareResult
      results.reduce(
        (acc, currentValue) => ({
          instructions: acc.instructions.concat(currentValue.instructions),
          signers: acc.signers.concat(currentValue.signers),
        }),
        { instructions: [], signers: [] }
      )
    );
  }

  private async getTransactionAccount(
    transactionAccountAddress: PublicKey
  ): Promise<TransactionAccount | null> {
    const transactionAccount =
      await this.program.account.transactionAccount.fetch(
        transactionAccountAddress
      );

    if (transactionAccount === null) return null;

    // TODO fix - the TransactionAccount type has `state` as type `never`
    return transactionAccount as unknown as TransactionAccount;
  }

  private async getCryptidTransaction(
    account: CryptidAccountDetails,
    transactionAccountAddress: PublicKey
  ): Promise<CryptidTransaction> {
    const transactionAccount = await this.getTransactionAccount(
      transactionAccountAddress
    );

    if (transactionAccount === null) {
      throw new Error("Transaction account not found");
    }

    return CryptidTransaction.fromTransactionAccount(
      account,
      this.authorityKey,
      transactionAccount,
      this.controllerChainPubkeys
    );
  }

  public async propose(
    account: CryptidAccountDetails,
    transaction: Transaction,
    state = TransactionState.Ready,
    allowUnauthorized = false
  ): Promise<ProposalResult> {
    const transactionAccountKeypair = Keypair.generate();
    const cryptidTransaction = CryptidTransaction.fromSolanaInstructions(
      account,
      this.authorityKey,
      transaction.instructions,
      this.controllerChainPubkeys
    );

    // execute middleware if the transaction is proposed in "ready" state
    // otherwise, wait until it is sealed
    let middlewareResult: MiddlewareResult = { instructions: [], signers: [] };
    if (state === TransactionState.Ready) {
      console.log(`Executing MiddlewareInstructions`);
      middlewareResult = await this.executeMiddlewareInstructions(
        account,
        transactionAccountKeypair.publicKey,
        "Propose"
      );
    }

    const unsignedProposeTransaction = await cryptidTransaction
      .propose(
        this.program,
        transactionAccountKeypair.publicKey,
        state,
        allowUnauthorized
      )
      .signers(
        // The signers in a proposal (other than an authority on the DID) are the transaction account
        // and any signers from the middleware
        [transactionAccountKeypair, ...middlewareResult.signers]
      )
      .postInstructions(middlewareResult.instructions)
      .transaction();

    return {
      proposeTransaction: unsignedProposeTransaction,
      transactionAccount: transactionAccountKeypair.publicKey,
      proposeSigners: [transactionAccountKeypair, ...middlewareResult.signers],
      cryptidTransactionRepresentation: cryptidTransaction,
    };
  }

  public async extend(
    account: CryptidAccountDetails,
    transactionAccountAddress: PublicKey,
    transaction: Transaction,
    state?: TransactionState,
    allowUnauthorized = false
  ): Promise<Transaction> {
    const cryptidTransaction = CryptidTransaction.fromSolanaInstructions(
      account,
      this.authorityKey,
      transaction.instructions,
      this.controllerChainPubkeys
    );

    let builder = cryptidTransaction.extend(
      this.program,
      transactionAccountAddress,
      state,
      allowUnauthorized
    );

    if (state === TransactionState.Ready) {
      // include any "proposal" middleware as the transaction is now moving to "ready" state
      // TODO are there any security issues if the middleware is executed twice?
      const middlewareResult = await this.executeMiddlewareInstructions(
        account,
        transactionAccountAddress,
        "Propose"
      );

      builder = builder
        .signers(middlewareResult.signers)
        .postInstructions(middlewareResult.instructions);
    }

    return builder.transaction();
  }

  public async proposeAndExecuteTransaction(
    account: CryptidAccountDetails,
    transaction: Transaction
  ): Promise<TransactionResult> {
    const transactionAccountKeypair = Keypair.generate();
    const cryptidTransaction = CryptidTransaction.fromSolanaInstructions(
      account,
      this.authorityKey,
      transaction.instructions,
      this.controllerChainPubkeys
    );

    const proposeInstruction = await cryptidTransaction
      .propose(this.program, transactionAccountKeypair.publicKey)
      .signers(
        // The only signer in a proposal (other than an authority on the DID) is the transaction account
        [transactionAccountKeypair]
      )
      .instruction();

    const middlewareProposeResults = await this.executeMiddlewareInstructions(
      account,
      transactionAccountKeypair.publicKey,
      "Propose"
    );
    const middlewareExecuteResults = await this.executeMiddlewareInstructions(
      account,
      transactionAccountKeypair.publicKey,
      "Execute"
    );

    const executeInstruction = await cryptidTransaction
      .execute(this.program, transactionAccountKeypair.publicKey)
      .signers([
        ...middlewareProposeResults.signers,
        ...middlewareExecuteResults.signers,
      ])
      .instruction();

    const executeTransaction = new Transaction().add(
      proposeInstruction,
      ...middlewareProposeResults.instructions,
      ...middlewareExecuteResults.instructions,
      executeInstruction
    );

    return {
      transaction: executeTransaction,
      signers: [
        transactionAccountKeypair,
        ...middlewareProposeResults.signers,
        ...middlewareExecuteResults.signers,
      ],
    };
  }

  public async execute(
    account: CryptidAccountDetails,
    transactionAccountAddress: PublicKey,
    cryptidTransaction?: CryptidTransaction
  ): Promise<TransactionResult> {
    const middlewareResult = await this.executeMiddlewareInstructions(
      account,
      transactionAccountAddress,
      "Execute"
    );

    const resolvedCryptidTransaction =
      cryptidTransaction ||
      (await this.getCryptidTransaction(account, transactionAccountAddress));

    const executeTransaction = await resolvedCryptidTransaction
      .execute(this.program, transactionAccountAddress)
      .preInstructions(middlewareResult.instructions)
      .signers(middlewareResult.signers)
      .transaction();

    return {
      transaction: executeTransaction,
      signers: [...middlewareResult.signers],
    };
  }

  public async close(
    account: CryptidAccountDetails,
    transactionAccountAddress: PublicKey,
    cryptidTransaction?: CryptidTransaction
  ): Promise<TransactionResult> {
    const middlewareResult = await this.executeMiddlewareInstructions(
      account,
      transactionAccountAddress,
      "Close"
    );

    const resolvedCryptidTransaction =
      cryptidTransaction ||
      (await this.getCryptidTransaction(account, transactionAccountAddress));

    const closeTransaction = await resolvedCryptidTransaction
      .close(this.program, transactionAccountAddress)
      .preInstructions(middlewareResult.instructions)
      .signers(middlewareResult.signers)
      .transaction();

    return {
      transaction: closeTransaction,
      signers: [...middlewareResult.signers],
    };
  }

  public async directExecute(
    account: CryptidAccountDetails,
    transaction: Transaction
  ): Promise<Transaction> {
    const cryptidTransaction = CryptidTransaction.fromSolanaInstructions(
      account,
      this.authorityKey,
      transaction.instructions,
      this.controllerChainPubkeys
    );
    return await cryptidTransaction.directExecute(this.program).transaction();
  }
}
