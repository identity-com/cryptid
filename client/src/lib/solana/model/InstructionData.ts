import { TransactionAccountMeta } from './TransactionAccountMeta';
import { add_struct_to_schema, Assignable } from '../solanaBorsh';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';

export class InstructionData extends Assignable<InstructionData> {
  program_id!: number;
  accounts!: TransactionAccountMeta[];
  data!: Uint8Array;

  constructor(props: {
    program_id: number;
    accounts: TransactionAccountMeta[];
    data: Uint8Array;
  }) {
    super(props);
  }

  static fromTransactionInstruction(
    instruction: TransactionInstruction,
    account_array: PublicKey[]
  ): InstructionData {
    const keyIndex = account_array.findIndex((value) =>
      value.equals(instruction.programId)
    );
    if (keyIndex < 0) {
      throw new Error(`Can't find key ${instruction.programId.toBase58()}`);
    }
    return new InstructionData({
      program_id: keyIndex,
      accounts: instruction.keys.map((meta) =>
        TransactionAccountMeta.fromAccountMeta(meta, account_array)
      ),
      data: instruction.data,
    });
  }
}

add_struct_to_schema(InstructionData, {
  program_id: 'u8',
  accounts: [TransactionAccountMeta],
  data: ['u8'],
});
