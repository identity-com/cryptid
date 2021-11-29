import {
  add_enum_to_schema,
  add_struct_to_schema,
  Assignable,
  AssignableBuffer,
  Enum,
  UnitValue,
} from '../solanaBorsh';
import InstructionData from './InstructionData';
import TransactionAccountMeta from './TransactionAccountMeta';

export default class InstructionOperation extends Enum<InstructionOperation> {
  push?: InstructionData;
  pop?: UnitValue;
  addAccount?: AddAccount;
  addAccounts?: AddAccounts;
  clearAccounts?: number;
  addData?: AddData;
  clearData?: number;
  clear?: UnitValue;

  constructor(
    props:
      | { push: InstructionData }
      | { pop: UnitValue }
      | { addAccount: AddAccount }
      | { addAccounts: AddAccounts }
      | { clearAccounts: number }
      | { addData: AddData }
      | { clearData: number }
      | { clear: UnitValue }
  ) {
    super(props);
  }
}

export class AddAccount extends Assignable<AddAccount> {
  index!: number;
  account!: TransactionAccountMeta;
}

export class AddAccounts extends Assignable<AddAccounts> {
  index!: number;
  accounts!: TransactionAccountMeta[];
}

export class AddData extends Assignable<AddData> {
  index!: number;
  data!: AssignableBuffer;

  constructor(props: { index: number; data: AssignableBuffer }) {
    super(props);
  }
}

add_enum_to_schema(InstructionOperation, {
  push: InstructionData,
  pop: UnitValue,
  addAccount: AddAccount,
  addAccounts: AddAccounts,
  clearAccounts: 'u8',
  addData: AddData,
  clearData: 'u8',
  clear: UnitValue,
});
add_struct_to_schema(AddAccount, {
  index: 'u8',
  account: TransactionAccountMeta,
});
add_struct_to_schema(AddAccounts, {
  index: 'u8',
  accounts: [TransactionAccountMeta],
});
add_struct_to_schema(AddData, {
  index: 'u8',
  data: AssignableBuffer,
});
