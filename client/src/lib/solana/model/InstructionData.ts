import { TransactionAccountMeta } from './TransactionAccountMeta';
import { add_struct_to_schema, Assignable } from '../solanaBorsh';
import { AssignablePublicKey } from './AssignablePublicKey';
import { TransactionInstruction } from '@solana/web3.js';

export class InstructionData extends Assignable<InstructionData> {
  program_id!: AssignablePublicKey;
  accounts!: TransactionAccountMeta[];
  data!: Uint8Array;

  constructor(props: {
    program_id: AssignablePublicKey;
    accounts: TransactionAccountMeta[];
    data: Uint8Array;
  }) {
    super(props);
  }

  static fromTransactionInstruction(
    instruction: TransactionInstruction
  ): InstructionData {
    return new InstructionData({
      program_id: AssignablePublicKey.fromPublicKey(instruction.programId),
      accounts: instruction.keys.map(TransactionAccountMeta.fromAccountMeta),
      data: instruction.data,
    });
  }
}

add_struct_to_schema(InstructionData, {
  program_id: AssignablePublicKey,
  accounts: [TransactionAccountMeta],
  data: ['u8'],
});
