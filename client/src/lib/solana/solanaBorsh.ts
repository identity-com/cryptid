/* eslint-disable @typescript-eslint/no-explicit-any */
import { serialize, deserialize } from 'borsh';
import { PublicKey } from '@solana/web3.js';

// Class wrapping a plain object
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export abstract class Assignable<Self, _V extends keyof Self & string> {
  encode(): Buffer {
    return Buffer.from(serialize(SCHEMA, this));
  }

  static decode<T extends Assignable<T, V>, V extends keyof T & string>(
    data: Buffer,
    tCons: Cons<T>
  ): T {
    return deserialize(SCHEMA, tCons, data);
  }
}

// Class representing a Rust-compatible enum, since enums are only strings or
// numbers in pure JS
export abstract class Enum<
  Self,
  V extends keyof Self & string
> extends Assignable<Self, V> {
  enum: V;
  protected constructor(variant: V) {
    super();
    this.enum = variant;
  }
}
export type Cons<T> = new (...args: any[]) => T;
export type FieldType =
  | 'u8'
  | 'u16'
  | 'u32'
  | 'u64'
  | 'u128'
  | 'u256'
  | 'u512'
  | 'buffer'
  | 'string'
  | Cons<any>;
export type ArrayedFieldType = [FieldType] | [number];

const SCHEMA: Map<
  Cons<any>,
  | {
      kind: 'struct';
      fields: ([number] | [string, FieldType | ArrayedFieldType])[];
    }
  | {
      kind: 'enum';
      field: 'enum';
      values: ([number] | [string, FieldType | ArrayedFieldType])[];
    }
> = new Map();

SCHEMA.set(PublicKey, {
  kind: 'struct',
  fields: [[32]],
});

export function add_struct_to_schema<
  T extends Assignable<T, any>,
  V extends keyof T & string
>(cons: Cons<T>, fields: { [P in V]: FieldType | ArrayedFieldType }): void {
  SCHEMA.set(cons, {
    kind: 'struct',
    fields: (Object.keys(fields) as Array<V>).map(key => [key, fields[key]]),
  });
}

export function add_enum_to_schema<
  T extends Enum<T, V>,
  V extends keyof T & string
>(cons: Cons<T>, values: { [P in V]: FieldType | ArrayedFieldType }): void {
  SCHEMA.set(cons, {
    kind: 'enum',
    field: 'enum',
    values: (Object.keys(values) as Array<V>).map(key => [key, values[key]]),
  });
}
