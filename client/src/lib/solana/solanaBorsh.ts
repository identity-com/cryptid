/* eslint-disable @typescript-eslint/no-explicit-any */
import { serialize, deserialize } from 'borsh';
import { PublicKey } from '@solana/web3.js';

// Class wrapping a plain object
export abstract class Assignable<Self, V extends keyof Self & string> {
  constructor(props: { [P in V]: Self[P] }) {
    (Object.keys(props) as (V & keyof this)[]).forEach(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore this is okay as long as Self == this
      key => (this[key] = props[key])
    );
  }

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
export abstract class Enum<Self, V extends keyof Self & string> {
  enum: V;
  //TODO: Find a way to do the one property check with types
  protected constructor(props: { [P in V]?: Self[P] }) {
    let key: (V & keyof this & keyof Self) | null = null;
    for (const prop in Object.keys(props) as V[]) {
      if (prop) {
        if (key) {
          throw new Error('Multiple variants for enum');
        } else {
          key = prop as V & keyof this & keyof Self;
        }
      }
    }
    if (!key) {
      throw new Error('No variants passed to enum');
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore this is okay as long as Self == this
    this[key] = props[key];
    this.enum = key;
  }

  encode(): Buffer {
    return Buffer.from(serialize(SCHEMA, this));
  }

  static decode<T extends Enum<T, V>, V extends keyof T & string>(
    data: Buffer,
    tCons: Cons<T>
  ): T {
    return deserialize(SCHEMA, tCons, data);
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
    fields: (Object.keys(fields) as V[]).map(key => [key, fields[key]]),
  });
}

export function add_enum_to_schema<
  T extends Enum<T, V>,
  V extends keyof T & string
>(cons: Cons<T>, values: { [P in V]: FieldType | ArrayedFieldType }): void {
  SCHEMA.set(cons, {
    kind: 'enum',
    field: 'enum',
    values: (Object.keys(values) as V[]).map(key => [key, values[key]]),
  });
}
