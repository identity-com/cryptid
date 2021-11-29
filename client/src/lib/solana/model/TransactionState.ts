import { add_enum_to_schema, Enum, UnitValue } from '../solanaBorsh';

export class TransactionState extends Enum<TransactionState> {
  notReady?: UnitValue;
  ready?: UnitValue;
  executed?: UnitValue;

  constructor(
    props:
      | { notReady: UnitValue }
      | { ready: UnitValue }
      | { executed: UnitValue }
  ) {
    super(props);
  }
}

add_enum_to_schema(TransactionState, {
  notReady: UnitValue,
  ready: UnitValue,
  executed: UnitValue,
});
