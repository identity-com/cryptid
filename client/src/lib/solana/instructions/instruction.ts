import {
  Enum,
  Assignable,
  add_enum_to_schema,
  add_struct_to_schema,
} from '../solanaBorsh';
import { InstructionData } from '../model/InstructionData';

export class DirectExecute extends Assignable<
  DirectExecute,
  'signers' | 'instructions'
> {
  signers!: number;
  instructions!: InstructionData[];

  constructor(props: { signers: number; instructions: InstructionData[] }) {
    super(props);
  }
}
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

  static directExecute(
    signers: number,
    instructions: InstructionData[]
  ): CryptidInstruction {
    return new CryptidInstruction({
      directExecute: new DirectExecute({ signers, instructions }),
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
add_struct_to_schema(DirectExecute, {});
