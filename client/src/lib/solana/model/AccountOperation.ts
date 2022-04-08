import { add_enum_to_schema, Enum, UnitValue } from '../solanaBorsh';
import AssignablePublicKey from './AssignablePublicKey';

export default class AccountOperation extends Enum<AccountOperation> {
  add?: AssignablePublicKey;
  clear?: UnitValue;
  addMany?: AssignablePublicKey[];

  constructor(
    props:
      | { add: AssignablePublicKey }
      | { clear: UnitValue }
      | { addMany: AssignablePublicKey[] }
  ) {
    super(props);
  }
}

add_enum_to_schema(AccountOperation, {
  add: AssignablePublicKey,
  clear: UnitValue,
  addMany: [AssignablePublicKey],
});
