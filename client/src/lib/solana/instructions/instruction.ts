import {
  add_enum_to_schema,
  add_struct_to_schema,
  Assignable,
  AssignableBoolean,
  AssignableI64,
  Enum,
} from '../solanaBorsh';
import { InstructionData } from '../model/InstructionData';
import { AssignablePublicKey } from '../model/AssignablePublicKey';
import { PublicKey } from '@solana/web3.js';
import { TransactionState } from '../model/TransactionState';
import { AccountOperation } from '../model/AccountOperation';
import { InstructionOperation } from '../model/InstructionOperation';
import { ProposeTransactionSigners } from '../model/ProposeTransactionSigners';

export class ProposeTransaction extends Assignable<ProposeTransaction> {
  signers!: ProposeTransactionSigners[];
  accountSize!: number;
  accounts!: AssignablePublicKey[];
  instructions!: InstructionData[];
  readyToExecute!: AssignableBoolean;
  accountSeed!: string;

  constructor(props: {
    signers: ProposeTransactionSigners[];
    accountSize: number;
    accounts: AssignablePublicKey[];
    instructions: InstructionData[];
    readyToExecute: AssignableBoolean;
    accountSeed: string;
  }) {
    super(props);
  }
}

export class ExpandTransaction extends Assignable<ExpandTransaction> {
  transactionState!: TransactionState;
  accountOperations!: AccountOperation[];
  instructionOperations!: InstructionOperation[];

  constructor(props: {
    transactionState: TransactionState;
    accountOperations: AccountOperation[];
    instructionOperations: InstructionOperation[];
  }) {
    super(props);
  }
}

export class DirectExecute extends Assignable<DirectExecute> {
  signers!: number[];
  instructions!: InstructionData[];
  flags!: number;

  constructor(props: {
    signers: number[];
    instructions: InstructionData[];
    flags: number;
  }) {
    super(props);
  }

  static buildFlags(debug: boolean): number {
    return +debug * DEBUG_FLAG;
  }
}
const DEBUG_FLAG = 1 << 0;

export class CryptidInstruction extends Enum<CryptidInstruction> {
  createCryptid?: number; // Placeholder
  proposeTransaction?: ProposeTransaction;
  expandTransaction?: ExpandTransaction;
  executeTransaction?: number;
  instruction4?: number; // Placeholder
  directExecute?: DirectExecute;

  constructor(
    props:
      | { proposeTransaction: ProposeTransaction }
      | { expandTransaction: ExpandTransaction }
      | { executeTransaction: number }
      | { directExecute: DirectExecute }
  ) {
    super(props);
  }

  /**
   * Builds propose transaction data
   * @param signers The extra number of accounts and when the signature expires
   * @param accountSize The size of the transaction account
   * @param accounts The accounts for the transaction
   * @param instructions The instructions for the transaction
   * @param readyToExecute Whether this transaction is ready or still being edited
   * @param accountSeed The seed for the transaction account
   */
  static proposeTransaction(
    signers: { signerExtras: number; expireTime: bigint }[],
    accountSize: number,
    accounts: PublicKey[],
    instructions: InstructionData[],
    readyToExecute: boolean,
    accountSeed: string
  ): CryptidInstruction {
    return new CryptidInstruction({
      proposeTransaction: new ProposeTransaction({
        accountSeed,
        accountSize,
        accounts: accounts.map(AssignablePublicKey.fromPublicKey),
        instructions,
        readyToExecute: new AssignableBoolean(readyToExecute),
        signers: signers.map(
          (signer) =>
            new ProposeTransactionSigners({
              ...signer,
              expireTime: new AssignableI64(signer.expireTime),
            })
        ),
      }),
    });
  }

  /**
   * Builds expand transaction data
   * @param transactionState The new state of the transaction
   * @param accountOperations The operations to execute on the accounts
   * @param instructionOperations The operations to execute on the instructions
   */
  static expandTransaction(
    transactionState: TransactionState,
    accountOperations: AccountOperation[],
    instructionOperations: InstructionOperation[]
  ): CryptidInstruction {
    return new CryptidInstruction({
      expandTransaction: new ExpandTransaction({
        accountOperations,
        instructionOperations,
        transactionState,
      }),
    });
  }

  /**
   * Builds execute transaction data
   * @param signingKeyExtras The number of extra accounts for the signing key
   */
  static executeTransaction(signingKeyExtras: number): CryptidInstruction {
    return new CryptidInstruction({
      executeTransaction: signingKeyExtras,
    });
  }

  /**
   * Builds direct execute instruction data
   * @param signers An array the same length as number of signers, each index being the number of extra accounts for that signer
   * @param instructions The instructions to execute, all accounts must be in the instruction
   * @param debug True if debug information should be printed, defaults to false
   */
  static directExecute(
    signers: number[],
    instructions: InstructionData[],
    debug = false
  ): CryptidInstruction {
    return new CryptidInstruction({
      directExecute: new DirectExecute({
        signers,
        instructions,
        flags: DirectExecute.buildFlags(debug),
      }),
    });
  }
}

add_enum_to_schema(CryptidInstruction, {
  createCryptid: 'u8', // Placeholder
  proposeTransaction: ProposeTransaction,
  expandTransaction: ExpandTransaction,
  executeTransaction: 'u8',
  instruction4: 'u8', // Placeholder
  directExecute: DirectExecute,
});
add_struct_to_schema(ProposeTransaction, {
  signers: [ProposeTransactionSigners],
  accountSize: 'u16',
  accounts: [AssignablePublicKey],
  instructions: [InstructionData],
  readyToExecute: AssignableBoolean,
  accountSeed: 'string',
});
add_struct_to_schema(ExpandTransaction, {
  transactionState: TransactionState,
  accountOperations: [AccountOperation],
  instructionOperations: [InstructionOperation],
});
add_struct_to_schema(DirectExecute, {
  signers: ['u8'],
  instructions: [InstructionData],
  flags: 'u8',
});
