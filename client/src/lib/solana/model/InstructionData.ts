import { TransactionAccountMeta } from './TransactionAccountMeta';
import { add_struct_to_schema, Assignable } from '../solanaBorsh';
import {AssignablePublicKey} from "./AssignablePublicKey";

export class InstructionData extends Assignable<InstructionData> {
  program_id!: AssignablePublicKey;
  accounts!: TransactionAccountMeta[];
  data!: Buffer;

  constructor(props: {
    program_id: AssignablePublicKey;
    accounts: TransactionAccountMeta[];
    data: Buffer;
  }) {
    super(props);
  }
}

add_struct_to_schema(InstructionData, {
  program_id: AssignablePublicKey,
  accounts: [TransactionAccountMeta],
  data: 'buffer',
});
