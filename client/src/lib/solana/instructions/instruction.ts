import {
  Enum,
  Assignable,
  add_enum_to_schema,
  add_struct_to_schema,
  AssignableBoolean,
  AssignableI64,
} from '../solanaBorsh';
import { InstructionData } from '../model/InstructionData';
import { AssignablePublicKey } from '../model/AssignablePublicKey';
import { PublicKey } from '@solana/web3.js';

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

export class ProposeTransactionSigners extends Assignable<ProposeTransactionSigners> {
  signerExtras!: number;
  expireTime!: AssignableI64;

  constructor(props: { signerExtras: number; expireTime: AssignableI64 }) {
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
  expandTransaction?: number;
  instruction3?: number; // Placeholder
  instruction4?: number; // Placeholder
  directExecute?: DirectExecute;

  constructor(
    props:
      | { directExecute: DirectExecute }
      | { proposeTransaction: ProposeTransaction }
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
        readyToExecute: new AssignableBoolean({ value: readyToExecute }),
        signers: signers.map(
          (signer) =>
            new ProposeTransactionSigners({
              ...signer,
              expireTime: new AssignableI64({ value: signer.expireTime }),
            })
        ),
      }),
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
  createCryptid: 'u8',
  proposeTransaction: ProposeTransaction,
  expandTransaction: 'u8',
  instruction3: 'u8',
  instruction4: 'u8',
  directExecute: DirectExecute,
});
add_struct_to_schema(ProposeTransaction, {
  signers: [ProposeTransactionSigners],
  accountSize: 'u16',
  accounts: [AssignablePublicKey],
  instructions: [InstructionData],
  readyToExecute: AssignableBoolean,
});
add_struct_to_schema(ProposeTransactionSigners, {
  signerExtras: 'u8',
  expireTime: AssignableI64,
});
add_struct_to_schema(DirectExecute, {
  signers: ['u8'],
  instructions: [InstructionData],
  flags: 'u8',
});
