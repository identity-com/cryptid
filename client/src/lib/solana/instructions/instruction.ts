import { Enum, Assignable, SCHEMA } from '../solanaBorsh';

export class DirectExecute extends Assignable {
  transaction!: Array<number>; // borsh prefers Array<number> to Uint8Array
}

export class CryptidInstruction extends Enum {
  directExecute!: DirectExecute;

  static directExecute(transaction: Array<number>): CryptidInstruction {
    return new CryptidInstruction({
      directExecute: new DirectExecute({ transaction }),
    });
  }
}

SCHEMA.set(CryptidInstruction, {
  kind: 'enum',
  field: 'enum',
  values: [['directExecute', DirectExecute]],
});
SCHEMA.set(DirectExecute, {
  kind: 'struct',
  fields: [['transaction', 'string']],
});
