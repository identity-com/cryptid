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

  static notReady(): TransactionState {
    return new TransactionState({ notReady: new UnitValue() });
  }

  static ready(): TransactionState {
    return new TransactionState({ ready: new UnitValue() });
  }

  static executed(): TransactionState {
    return new TransactionState({ executed: new UnitValue() });
  }
}

add_enum_to_schema(TransactionState, {
  notReady: UnitValue,
  ready: UnitValue,
  executed: UnitValue,
});
