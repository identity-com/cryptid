import { TransactionAccountMeta } from './TransactionAccountMeta';
import { add_struct_to_schema, Assignable } from '../solanaBorsh';
import { AssignablePublicKey } from './AssignablePublicKey';

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
}

add_struct_to_schema(InstructionData, {
  program_id: AssignablePublicKey,
  accounts: [TransactionAccountMeta],
  data: ['u8'],
});
