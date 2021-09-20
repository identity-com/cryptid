import { PublicKey } from '@solana/web3.js';
import { TransactionAccountMeta } from './TransactionAccountMeta';
import { add_struct_to_schema, Assignable } from '../solanaBorsh';

export class InstructionData extends Assignable<
  InstructionData,
  'program_id' | 'accounts' | 'data'
> {
  program_id!: PublicKey;
  accounts!: TransactionAccountMeta[];
  data!: Buffer;

  constructor(props: {
    program_id: PublicKey;
    accounts: TransactionAccountMeta[];
    data: Buffer;
  }) {
    super(props);
  }
}

add_struct_to_schema(InstructionData, {
  program_id: PublicKey,
  accounts: [TransactionAccountMeta],
  data: 'buffer',
});
