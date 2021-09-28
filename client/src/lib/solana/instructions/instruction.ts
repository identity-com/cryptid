import {
  Enum,
  Assignable,
  add_enum_to_schema,
  add_struct_to_schema,
} from '../solanaBorsh';
import { InstructionData } from '../model/InstructionData';

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
  createDOA?: number; // Placeholder
  proposeTransaction?: number; // Placeholder
  instruction2?: number; // Placeholder
  instruction3?: number; // Placeholder
  instruction4?: number; // Placeholder
  directExecute?: DirectExecute;

  constructor(props: { directExecute: DirectExecute }) {
    super(props);
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
    debug: boolean = false
  ): CryptidInstruction {
    return new CryptidInstruction({
      directExecute: new DirectExecute({ signers, instructions, flags: DirectExecute.buildFlags(debug) }),
    });
  }
}

add_enum_to_schema(CryptidInstruction, {
  createDOA: 'u8',
  proposeTransaction: 'u8',
  instruction2: 'u8',
  instruction3: 'u8',
  instruction4: 'u8',
  directExecute: DirectExecute,
});
add_struct_to_schema(DirectExecute, {
  signers: ['u8'],
  instructions: [InstructionData],
  flags: 'u8',
});
