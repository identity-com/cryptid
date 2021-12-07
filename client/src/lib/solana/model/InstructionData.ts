import TransactionAccountMeta from './TransactionAccountMeta';
import {
  add_struct_to_schema,
  Assignable,
  AssignableBuffer,
} from '../solanaBorsh';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';

export default class InstructionData extends Assignable<InstructionData> {
  program_id!: number;
  accounts!: TransactionAccountMeta[];
  data!: AssignableBuffer;

  static fromTransactionInstruction(
    instruction: TransactionInstruction,
    accountArray: PublicKey[]
  ): InstructionData {
    const keyIndex = accountArray.findIndex((value) =>
      value.equals(instruction.programId)
    );
    if (keyIndex < 0) {
      throw new Error(`Can't find key ${instruction.programId.toBase58()}`);
    }
    return new InstructionData({
      program_id: keyIndex,
      accounts: instruction.keys.map((meta) =>
        TransactionAccountMeta.fromAccountMeta(meta, accountArray)
      ),
      data: new AssignableBuffer(instruction.data),
    });
  }
}

add_struct_to_schema(InstructionData, {
  program_id: 'u8',
  accounts: [TransactionAccountMeta],
  data: AssignableBuffer,
});
