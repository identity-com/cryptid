import {
  add_enum_to_schema,
  add_struct_to_schema,
  Assignable,
  Enum,
  UnitValue,
} from '../solanaBorsh';
import { InstructionData } from './InstructionData';
import { TransactionAccountMeta } from './TransactionAccountMeta';

export class InstructionOperation extends Enum<InstructionOperation> {
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

  constructor(props: { index: number; account: TransactionAccountMeta }) {
    super(props);
  }
}

export class AddAccounts extends Assignable<AddAccounts> {
  index!: number;
  account!: TransactionAccountMeta[];

  constructor(props: { index: number; account: TransactionAccountMeta[] }) {
    super(props);
  }
}

export class AddData extends Assignable<AddData> {
  index!: number;
  data!: Buffer;

  constructor(props: { index: number; data: Buffer }) {
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
  account: [TransactionAccountMeta],
});
add_struct_to_schema(AddData, {
  index: 'u8',
  data: 'buffer',
});
