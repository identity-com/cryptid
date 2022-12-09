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
import { ControllerAccountMetaInfo, ControllerPubkeys } from "../types/cryptid";

// Used to replace the current signer
// so that the InstructionData are required to reference the signer in a separate position in the array,
// and not index 3. This is because the signer is not known at creation time.
// TODO - PublicKey.default uses the default key 11111111111111111111111111111111 which is the same as the system program.
// This is unsuitable as it may be referenced in the instructions somewhere. So we generate a "single use" key here.
// It feels hacky - is there a better alternative?
const NULL_KEY = Keypair.generate().publicKey; // PublicKey.default;

export class CryptidTransaction {
  constructor(
    readonly cryptidAccount: CryptidAccountDetails,
    readonly authority: PublicKey,
    readonly instructions: InstructionData[],
    readonly accountMetas: AccountMeta[],
    readonly controllerChain: ControllerAccountReference[]
  ) {}

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
    // 1 - did*
    // 2 - did program*
    // 3 - signer*
    // ... remaining accounts
    //
    // * These accounts are omitted from the Propose Transaction Accounts but included in the execute instructions
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
    const filteredAccountMetas = accountMetas.filter(
      (a) =>
        !namedAccounts
          .map((account) => account.toBase58())
          .includes(a.pubkey.toBase58())
    );
    const [controllersAccountMetas, controllerIndices] =
      CryptidTransaction.controllerChainToRemainingAccounts(
        controllerChain,
        availableInstructionAccounts
      );

    const allAccountMetas = [
      ...filteredAccountMetas,
      ...controllersAccountMetas,
    ];

    console.log({ controllersAccountMetas, controllerIndices });

    return new CryptidTransaction(
      cryptidAccount,
      authority,
      instructions,
      allAccountMetas,
      controllerIndices
    );
  }

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
      authority,
    ];
    const remainingAccounts = transactionAccount.accounts;
    const allAccounts = [...namedAccounts, ...remainingAccounts];
    const accountMetas = transactionAccountMetasToAccountMetas(
      instructions.flatMap((i) => [
        ...(i.accounts as TransactionAccountMeta[]),
        { key: i.programId, meta: 0 },
      ]),
      allAccounts,
      cryptidAccount
    );
    const filteredAccountMetas = accountMetas.filter(
      (a) =>
        !namedAccounts
          .map((account) => account.toBase58())
          .includes(a.pubkey.toBase58())
    );

    const [controllersAccountMetas, controllerIndices] =
      CryptidTransaction.controllerChainToRemainingAccounts(
        controllerChain,
        allAccounts
      );

    const allAccountMetas = [
      ...filteredAccountMetas,
      ...controllersAccountMetas,
    ];

    return new CryptidTransaction(
      cryptidAccount,
      authority,
      instructions,
      allAccountMetas,
      controllerIndices
    );
  }

  // TODO move transactionAccountAddress into constructor?

  static controllerChainToRemainingAccounts(
    controllerChain: ControllerPubkeys[],
    allAccounts: PublicKey[]
  ): ControllerAccountMetaInfo {
    const reducer = (
      [accounts, indices]: ControllerAccountMetaInfo,
      controller: AccountMeta
    ): ControllerAccountMetaInfo => {
      const index = allAccounts.findIndex(
        (a) => a.toBase58() === controller.pubkey.toBase58()
      );

      if (index >= 0) {
        // controller is in the list of all accounts, no need to add an accountMeta, just push the index
        return [accounts, [...indices, index]];
      } else {
        // controller is new (not in the list of all accounts, add an accountMeta
        return [
          [...accounts, controller],
          [...indices, allAccounts.length + accounts.length],
        ];
      }
    };

    const controllerAccountMetas: AccountMeta[] = controllerChain.map(
      ([didAccount]) => ({
        pubkey: didAccount,
        isWritable: false,
        isSigner: false,
      })
    );

    return controllerAccountMetas.reduce(reducer, [[], []]);
  }
  // The anchor MethodsBuilder type is not exposed
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  propose(program: Program<Cryptid>, transactionAccountAddress: PublicKey) {
    return program.methods
      .proposeTransaction(
        Buffer.from([]), // TODO, support controller chain,
        this.cryptidAccount.bump,
        this.cryptidAccount.index,
        this.cryptidAccount.didAccountBump,
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
      .remainingAccounts(this.accountMetas);
  }

  // TODO move transactionAccountAddress into constructor?
  // The anchor MethodsBuilder type is not exposed
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  execute(program: Program<Cryptid>, transactionAccountAddress: PublicKey) {
    return program.methods
      .executeTransaction(
        Buffer.from(this.controllerChainIndices),
        this.cryptidAccount.bump,
        this.cryptidAccount.index,
        this.cryptidAccount.didAccountBump,
        0
      )
      .accounts({
        cryptidAccount: this.cryptidAccount.address,
        didProgram: DID_SOL_PROGRAM,
        did: this.cryptidAccount.didAccount,
        signer: this.authority,
        destination: this.authority,
        transactionAccount: transactionAccountAddress,
      })
      .remainingAccounts(this.accountMetas);
  }

  // The anchor MethodsBuilder type is not exposed
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  directExecute(program: Program<Cryptid>) {
    return program.methods
      .directExecute(
        Buffer.from(this.controllerChainIndices),
        this.instructions,
        this.cryptidAccount.bump,
        this.cryptidAccount.index,
        this.cryptidAccount.didAccountBump,
        0
      )
      .accounts({
        cryptidAccount: this.cryptidAccount.address,
        did: this.cryptidAccount.didAccount,
        didProgram: DID_SOL_PROGRAM,
        signer: this.authority,
      })
      .remainingAccounts(this.accountMetas);
  }
}
