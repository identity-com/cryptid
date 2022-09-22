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
import { AnchorProvider, Program } from "@project-serum/anchor";
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
import { ProposalResult } from "../types/cryptid";

export class CryptidService {
  readonly program: Program<Cryptid>;
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
    const anchorProvider = new AnchorProvider(connection, authority, opts);

    this.authorityKey = authority.publicKey;

    this.program = new Program<Cryptid>(
      CryptidIDL,
      CRYPTID_PROGRAM,
      anchorProvider
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
    const defaultAccountDetails = await CryptidAccountDetails.defaultAccount(
      did
    );

    // do not do a lookup for index 0, as it is the default account
    const adaptedOffset = offset === 0 ? offset + 1 : offset;

    const didAccount = await didToPDA(did);
    const addresses = await Promise.all(
      range(adaptedOffset, offset + page).map(
        (index) => getCryptidAccountAddress(didAccount, index)[0]
      )
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
      .create(lastMiddleware?.address || null, details.index, details.bump)
      .accounts({
        cryptidAccount: details.address,
        didProgram: DID_SOL_PROGRAM,
        did: details.didAccount,
        authority: this.authorityKey,
      })
      .rpc();
  }

  private async sign(
    unsignedTransaction: Transaction,
    signers: Keypair[]
  ): Promise<Transaction> {
    const { blockhash } =
      await this.program.provider.connection.getLatestBlockhash();
    unsignedTransaction.recentBlockhash = blockhash;
    unsignedTransaction.feePayer = this.authorityKey;
    if (signers.length) unsignedTransaction.partialSign(...signers);

    return this.authority.signTransaction(unsignedTransaction);
  }

  private async executeMiddlewareInstructions(
    account: CryptidAccountDetails,
    transactionAccount: PublicKey
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

    return Promise.all(
      middlewareContexts.map(({ client, accounts }) =>
        client.executeMiddleware({
          ...executeParameters,
          middlewareAccount: accounts.address,
        })
      )
    );
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

    const unsignedProposeTransaction = await cryptidTransaction
      .propose(this.program, transactionAccountKeypair.publicKey)
      .signers(
        // The only signer in a proposal (other than an authority on the DID) is the transaction account
        [transactionAccountKeypair]
      )
      .transaction();

    const proposeTransaction = await this.sign(unsignedProposeTransaction, [
      transactionAccountKeypair,
    ]);

    return {
      proposeTransaction: proposeTransaction,
      transactionAccountAddress: transactionAccountKeypair.publicKey,
      cryptidTransactionRepresentation: cryptidTransaction,
    };
  }

  public async proposeAndExecuteTransaction(
    account: CryptidAccountDetails,
    transaction: Transaction,
    signers: Keypair[] = []
  ): Promise<Transaction> {
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

    const middlewareInstructions = await this.executeMiddlewareInstructions(
      account,
      transactionAccountKeypair.publicKey
    );

    const executeInstruction = await cryptidTransaction
      .execute(this.program, transactionAccountKeypair.publicKey)
      .instruction();

    const proposeExecuteTransaction = new Transaction().add(
      proposeInstruction,
      ...middlewareInstructions,
      executeInstruction
    );

    return this.sign(proposeExecuteTransaction, [
      transactionAccountKeypair,
      ...signers,
    ]);
  }

  public async execute(
    account: CryptidAccountDetails,
    transactionAccountAddress: PublicKey,
    signers: Keypair[] = [],
    cryptidTransaction?: CryptidTransaction
  ): Promise<Transaction> {
    const middlewareInstructions = await this.executeMiddlewareInstructions(
      account,
      transactionAccountAddress
    );

    const resolvedCryptidTransaction =
      cryptidTransaction ||
      (await this.getCryptidTransaction(account, transactionAccountAddress));

    const unsignedExecuteTransaction = await resolvedCryptidTransaction
      .execute(this.program, transactionAccountAddress)
      .preInstructions(middlewareInstructions)
      .signers([...signers])
      .transaction();

    return this.sign(unsignedExecuteTransaction, signers);
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
    const unsignedDirectExecuteTransaction = await cryptidTransaction
      .directExecute(this.program)
      .transaction();
    return this.sign(unsignedDirectExecuteTransaction, []);
  }
}
