import {
  InstructionData,
  TransactionAccount,
  TransactionAccountMeta,
} from "../types";
import {
  AccountMeta,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  extractAccountMetas,
  toInstructionData,
  transactionAccountMetasToAccountMetas,
  uniqueKeys,
} from "./cryptid";
import { Program } from "@project-serum/anchor";
import { Cryptid } from "@identity.com/cryptid-idl";
import { DID_SOL_PROGRAM } from "@identity.com/sol-did-client";
import { CryptidAccountDetails } from "./CryptidAccountDetails";
import {
  ControllerAccountMetaInfo,
  ControllerAccountReference,
  ControllerPubkeys,
  TransactionState,
} from "../types/cryptid";

// Used to replace the current signer
// so that the InstructionData are required to reference the signer in a separate position in the array,
// and not index 3. This is because the signer is not known at creation time.
// PublicKey.default uses the default key 11111111111111111111111111111111 which is the same as the system program.
// This is unsuitable as it may be referenced in the instructions somewhere. So we generate a "single use" key here.
// TODO - It feels hacky - is there a better alternative?
const NULL_KEY = Keypair.generate().publicKey; // PublicKey.default;

export class CryptidTransaction {
  constructor(
    readonly cryptidAccount: CryptidAccountDetails,
    readonly authority: PublicKey,
    readonly instructions: InstructionData[],
    readonly accountMetas: AccountMeta[],
    readonly controllerChainReferences: ControllerAccountReference[]
  ) {}

  get accountMetasOnlyKeys(): AccountMeta[] {
    return this.accountMetas.map((a) => ({
      pubkey: a.pubkey,
      isWritable: false,
      isSigner: false,
    }));
  }

  /**
   * Convert a set of instructions into a CryptidTransaction object that can execute the
   * cryptid "propose" or "directExecute" commands on it.
   * @param cryptidAccount The cryptid account owner of the transaction
   * @param authority An authority (signer) on this cryptid account (direct or via a controller DID)
   * @param solanaInstructions The standard solana instructions to execute via cryptid
   * @param controllerChain The controller chain linking the authority to the DID owner of the cryptid account
   */
  static fromSolanaInstructions(
    cryptidAccount: CryptidAccountDetails,
    authority: PublicKey,
    solanaInstructions: TransactionInstruction[],
    controllerChain: ControllerPubkeys[]
  ): CryptidTransaction {
    const accountMetas = extractAccountMetas(
      solanaInstructions,
      cryptidAccount
    );
    // The accounts available to the instructions are in the following order:
    // Execute Transaction Accounts:
    // 0 - cryptid account
    // 1 - did
    // 2 - did program
    // 3 - signer
    // ... remaining accounts
    const namedAccounts = [
      cryptidAccount.address,
      cryptidAccount.didAccount,
      DID_SOL_PROGRAM,
      // This key is added in place of the signer (aka authority),
      // so that the InstructionData are required to reference the signer in a separate position in the array,
      // and not index 3. This is because the signer at execute time is not known at creation time,
      // and may be different to the authority here.
      // TODO: This is not the case for DirectExecute, so we could optimise here.
      NULL_KEY,
    ];
    const availableInstructionAccounts = uniqueKeys([
      ...namedAccounts,
      ...accountMetas.map((a) => a.pubkey),
    ]);
    const instructions = solanaInstructions.map(
      toInstructionData(availableInstructionAccounts)
    );
    const filteredRemainingAccountMetas = accountMetas.filter(
      (a) =>
        !namedAccounts
          .map((account) => account.toBase58())
          .includes(a.pubkey.toBase58())
    );
    const [controllersAccountMetas, controllerReferences] =
      CryptidTransaction.controllerChainToRemainingAccounts(
        controllerChain,
        availableInstructionAccounts
      );

    const allAccountMetas = [
      ...filteredRemainingAccountMetas,
      ...controllersAccountMetas,
    ];

    console.log("fromSolanaInstructions", {
      authority: authority.toBase58(),
      accountMetas: accountMetas.map((a) => a.pubkey.toBase58()),
      filteredRemainingAccountMetas: filteredRemainingAccountMetas.map((a) =>
        a.pubkey.toBase58()
      ),
      instructions: instructions.map((i) => i.accounts.map((a) => a.key)),
      namedAccounts: namedAccounts.map((a) => a.toBase58()),
    });

    return new CryptidTransaction(
      cryptidAccount,
      authority,
      instructions,
      allAccountMetas,
      controllerReferences
    );
  }

  /**
   * Given an existing transaction account, create a cryptidTransaction object which can be used to execute
   * cryptid commands (extend, execute) on the underlying transaction account.
   * @param cryptidAccount The cryptid account owner of the transaction
   * @param authority An authority (signer) on this cryptid account (direct or via a controller DID)
   * @param transactionAccount The underlying transaction account
   * @param controllerChain The controller chain linking the authority to the DID owner of the cryptid account
   */
  static fromTransactionAccount(
    cryptidAccount: CryptidAccountDetails,
    authority: PublicKey,
    transactionAccount: TransactionAccount,
    controllerChain: ControllerPubkeys[]
  ): CryptidTransaction {
    // TODO remove typecasting in this function
    const instructions = transactionAccount.instructions as InstructionData[];
    const namedAccounts = [
      cryptidAccount.address,
      cryptidAccount.didAccount,
      DID_SOL_PROGRAM,
      // This key is added in place of the signer (aka authority),
      // so that the InstructionData are required to reference the signer in a separate position in the array,
      // and not index 3. This is because the signer at execute time is not known at creation time,
      // and may be different to the authority here.
      NULL_KEY,
    ];
    const allAccounts = transactionAccount.accounts;
    const accountMetasFromInstructions = transactionAccountMetasToAccountMetas(
      instructions.flatMap((i) => [
        ...(i.accounts as TransactionAccountMeta[]),
        { key: i.programId, meta: 0 },
      ]),
      allAccounts,
      cryptidAccount
    );
    const filteredAccountMetasFromInstructionsExcludingNamedAccounts =
      accountMetasFromInstructions.filter(
        (a) =>
          !namedAccounts
            .map((account) => account.toBase58())
            .includes(a.pubkey.toBase58())
      );

    const [controllersAccountMetas, controllerIndices] =
      CryptidTransaction.controllerChainToRemainingAccounts(
        controllerChain,
        // allAccounts includes all accounts in transactionAccount,
        // therefore also including the controller accounts,
        // so the controller account is filtered out
        allAccounts
      );

    const allRemainingAccountMetas = [
      ...filteredAccountMetasFromInstructionsExcludingNamedAccounts,
      ...controllersAccountMetas,
    ];

    return new CryptidTransaction(
      cryptidAccount,
      authority,
      instructions,
      allRemainingAccountMetas,
      controllerIndices
    );
  }

  /**
   * Given an array of controllers, generate a set of accountMetas that will be
   * added to the remainingAccounts of any cryptid commands
   * @param controllerChain
   * @param allAccounts
   */
  static controllerChainToRemainingAccounts(
    controllerChain: ControllerPubkeys[],
    allAccounts: PublicKey[]
  ): ControllerAccountMetaInfo {
    const reducer = (
      [accounts, references]: ControllerAccountMetaInfo,
      [controllerAccountMeta, controllerDidAuthorityKey]: [
        AccountMeta,
        PublicKey
      ]
    ): ControllerAccountMetaInfo => {
      const existingAccountIndex = allAccounts.findIndex(
        (a) => a.toBase58() === controllerAccountMeta.pubkey.toBase58()
      );

      // if the controller is in the list of all accounts, use that index
      // otherwise, if the controller is new (not in the list of all accounts),
      // its reference is the next available index
      const accountIndex =
        existingAccountIndex >= 0
          ? existingAccountIndex
          : allAccounts.length + accounts.length;
      const reference = {
        accountIndex,
        authorityKey: controllerDidAuthorityKey,
      };

      return [
        [...accounts, controllerAccountMeta],
        [...references, reference],
      ];
    };

    const controllerAccountMetas: [AccountMeta, PublicKey][] =
      controllerChain.map(([didAccount, didAuthorityKey]) => [
        {
          pubkey: didAccount,
          isWritable: false,
          isSigner: false,
        },
        didAuthorityKey,
      ]);

    return controllerAccountMetas.reduce(reducer, [[], []]);
  }

  private flags(): number {
    return process.env.DEBUG ? 1 : 0;
  }

  /**
   * Create a proposal transaction for this cryptidTransaction
   * @param program
   * @param transactionAccountAddress
   * @param state
   * @param allowUnauthorized if true, transactions can be proposed by non-signers on the cryptid account.
   * they can then be authorized by superuser middleware
   */
  // TODO move transactionAccountAddress into constructor?
  // The anchor MethodsBuilder type is not exposed
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  propose(
    program: Program<Cryptid>,
    transactionAccountAddress: PublicKey,
    state = TransactionState.Ready,
    allowUnauthorized = false
  ) {
    return (
      program.methods
        .proposeTransaction(
          this.controllerChainReferences,
          this.cryptidAccount.bump,
          this.cryptidAccount.index,
          this.cryptidAccount.didAccountBump,
          TransactionState.toBorsh(state),
          allowUnauthorized,
          this.instructions,
          this.accountMetas.length
        )
        .accounts({
          cryptidAccount: this.cryptidAccount.address,
          didProgram: DID_SOL_PROGRAM,
          did: this.cryptidAccount.didAccount,
          authority: this.authority,
          transactionAccount: transactionAccountAddress,
        })
        // Propose does not require remainingAccounts to be signers or writable
        .remainingAccounts(this.accountMetasOnlyKeys)
    );
  }

  /**
   * Extend an existing cryptidTransaction
   * @param program
   * @param transactionAccountAddress
   * @param state
   * @param allowUnauthorized
   */
  // TODO move transactionAccountAddress into constructor?
  extend(
    program: Program<Cryptid>,
    transactionAccountAddress: PublicKey,
    // by default, extend the transaction and seal it at the same time
    state = TransactionState.Ready,
    allowUnauthorized = false
  ) {
    return (
      program.methods
        .extendTransaction(
          this.controllerChainReferences,
          this.cryptidAccount.bump,
          this.cryptidAccount.index,
          this.cryptidAccount.didAccountBump,
          TransactionState.toBorsh(state),
          allowUnauthorized,
          this.instructions,
          this.accountMetas.length
        )
        .accounts({
          cryptidAccount: this.cryptidAccount.address,
          didProgram: DID_SOL_PROGRAM,
          did: this.cryptidAccount.didAccount,
          authority: this.authority,
          transactionAccount: transactionAccountAddress,
        })
        // Extend does not require remainingAccounts to be signers or writable
        .remainingAccounts(this.accountMetasOnlyKeys)
    );
  }

  /**
   * Execute an existing cryptidTransaction
   * @param program
   * @param transactionAccountAddress
   */
  // TODO move transactionAccountAddress into constructor?
  // The anchor MethodsBuilder type is not exposed
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  execute(program: Program<Cryptid>, transactionAccountAddress: PublicKey) {
    return program.methods
      .executeTransaction(
        this.controllerChainReferences,
        this.cryptidAccount.bump,
        this.cryptidAccount.index,
        this.cryptidAccount.didAccountBump,
        this.flags()
      )
      .accounts({
        cryptidAccount: this.cryptidAccount.address,
        didProgram: DID_SOL_PROGRAM,
        did: this.cryptidAccount.didAccount,
        authority: this.authority,
        destination: this.authority,
        transactionAccount: transactionAccountAddress,
      })
      .remainingAccounts(this.accountMetas);
  }

  /**
   * Create and directly execute a cryptidTransaction
   * @param program
   */
  // The anchor MethodsBuilder type is not exposed
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  directExecute(program: Program<Cryptid>) {
    return program.methods
      .directExecute(
        this.controllerChainReferences,
        this.instructions,
        this.cryptidAccount.bump,
        this.cryptidAccount.index,
        this.cryptidAccount.didAccountBump,
        this.flags()
      )
      .accounts({
        cryptidAccount: this.cryptidAccount.address,
        did: this.cryptidAccount.didAccount,
        didProgram: DID_SOL_PROGRAM,
        authority: this.authority,
      })
      .remainingAccounts(this.accountMetas);
  }
}
