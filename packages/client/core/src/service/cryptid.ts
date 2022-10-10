import {
  AccountInfo,
  ConfirmOptions,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Wallet } from "../types/crypto";
import { AnchorProvider, parseIdlErrors, Program } from "@project-serum/anchor";
import { Cryptid, CryptidIDL } from "@identity.com/cryptid-idl";
import { CRYPTID_PROGRAM } from "../constants";
import {
  CryptidAccount,
  ExecuteMiddlewareParams,
  TransactionAccount,
} from "../types";
import { CryptidTransaction } from "../lib/CryptidTransaction";
import { CryptidAccountDetails } from "../lib/CryptidAccountDetails";
import { noSignWallet } from "../lib/crypto";
import { getCryptidAccountAddress } from "../lib/cryptid";
import { range } from "ramda";
import { didToPDA } from "../lib/did";
import { DID_SOL_PROGRAM } from "@identity.com/sol-did-client";
import { MiddlewareRegistry } from "./middlewareRegistry";
import { ProposeExecuteResult, ProposalResult } from "../types/cryptid";

export class CryptidService {
  readonly program: Program<Cryptid>;
  readonly provider: AnchorProvider;
  readonly idlErrors: Map<number, string>;
  private authorityKey: PublicKey;

  static permissionless(
    connection: Connection,
    opts: ConfirmOptions = {}
  ): CryptidService {
    return new CryptidService(noSignWallet(), connection, opts);
  }

  constructor(
    private authority: Wallet,
    private connection: Connection,
    private opts: ConfirmOptions = {}
  ) {
    this.provider = new AnchorProvider(connection, authority, opts);
    this.idlErrors = parseIdlErrors(CryptidIDL);

    this.authorityKey = authority.publicKey;

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
    return this.program.methods
      .create(
        lastMiddleware?.address || null,
        details.index,
        details.didAccountBump
      )
      .accounts({
        cryptidAccount: details.address,
        didProgram: DID_SOL_PROGRAM,
        did: details.didAccount,
        authority: this.authorityKey,
      })
      .rpc();
  }

  private async executeMiddlewareInstructions(
    account: CryptidAccountDetails,
    transactionAccount: PublicKey,
    stage: "Propose" | "Execute"
  ): Promise<TransactionInstruction[]> {
    const middlewareContexts =
      MiddlewareRegistry.get().getMiddlewareContexts(account);
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

    const middlewareFn = stage === "Propose" ? "onPropose" : "onExecute";

    return Promise.all(
      middlewareContexts.map(({ client, accounts }) =>
        client[middlewareFn]({
          ...executeParameters,
          middlewareAccount: accounts.address,
        })
      )
    ).then((instructions) => instructions.flat());
  }

  private async getCryptidTransaction(
    account: CryptidAccountDetails,
    transactionAccountAddress: PublicKey
  ): Promise<CryptidTransaction> {
    const txAccount = await this.program.account.transactionAccount.fetch(
      transactionAccountAddress
    );
    // TODO fix - the TransactionAccount type has `state` as type `never`
    const transactionAccount: TransactionAccount =
      txAccount as unknown as TransactionAccount;

    return CryptidTransaction.fromTransactionAccount(
      account,
      this.authorityKey,
      transactionAccount
    );
  }

  public async propose(
    account: CryptidAccountDetails,
    transaction: Transaction
  ): Promise<ProposalResult> {
    const transactionAccountKeypair = Keypair.generate();
    const cryptidTransaction = CryptidTransaction.fromSolanaInstructions(
      account,
      this.authorityKey,
      transaction.instructions
    );

    const middlewareInstructions = await this.executeMiddlewareInstructions(
      account,
      transactionAccountKeypair.publicKey,
      "Propose"
    );

    const unsignedProposeTransaction = await cryptidTransaction
      .propose(this.program, transactionAccountKeypair.publicKey)
      .signers(
        // The only signer in a proposal (other than an authority on the DID) is the transaction account
        [transactionAccountKeypair]
      )
      .postInstructions(middlewareInstructions)
      .transaction();

    // don't sign
    // const proposeTransaction = await this.sign(unsignedProposeTransaction, [
    //   transactionAccountKeypair,
    // ]);

    return {
      proposeTransaction: unsignedProposeTransaction,
      transactionAccount: transactionAccountKeypair,
      cryptidTransactionRepresentation: cryptidTransaction,
    };
  }

  public async proposeAndExecuteTransaction(
    account: CryptidAccountDetails,
    transaction: Transaction
  ): Promise<ProposeExecuteResult> {
    const transactionAccountKeypair = Keypair.generate();
    const cryptidTransaction = CryptidTransaction.fromSolanaInstructions(
      account,
      this.authorityKey,
      transaction.instructions
    );

    const proposeInstruction = await cryptidTransaction
      .propose(this.program, transactionAccountKeypair.publicKey)
      .signers(
        // The only signer in a proposal (other than an authority on the DID) is the transaction account
        [transactionAccountKeypair]
      )
      .instruction();

    const middlewareProposeInstructions =
      await this.executeMiddlewareInstructions(
        account,
        transactionAccountKeypair.publicKey,
        "Propose"
      );
    const middlewareExecuteInstructions =
      await this.executeMiddlewareInstructions(
        account,
        transactionAccountKeypair.publicKey,
        "Execute"
      );

    const executeInstruction = await cryptidTransaction
      .execute(this.program, transactionAccountKeypair.publicKey)
      .instruction();

    const proposeExecuteTransaction = new Transaction().add(
      proposeInstruction,
      ...middlewareProposeInstructions,
      ...middlewareExecuteInstructions,
      executeInstruction
    );

    return {
      proposeExecuteTransaction,
      transactionAccount: transactionAccountKeypair,
    };
  }

  public async execute(
    account: CryptidAccountDetails,
    transactionAccountAddress: PublicKey,
    signers: Keypair[] = [],
    cryptidTransaction?: CryptidTransaction
  ): Promise<Transaction> {
    const middlewareInstructions = await this.executeMiddlewareInstructions(
      account,
      transactionAccountAddress,
      "Execute"
    );

    const resolvedCryptidTransaction =
      cryptidTransaction ||
      (await this.getCryptidTransaction(account, transactionAccountAddress));

    return resolvedCryptidTransaction
      .execute(this.program, transactionAccountAddress)
      .preInstructions(middlewareInstructions)
      .signers([...signers])
      .transaction();
  }

  public async directExecute(
    account: CryptidAccountDetails,
    transaction: Transaction
  ): Promise<Transaction> {
    const cryptidTransaction = CryptidTransaction.fromSolanaInstructions(
      account,
      this.authorityKey,
      transaction.instructions
    );
    return await cryptidTransaction
      .directExecute(this.program)
      .transaction();
  }
}
