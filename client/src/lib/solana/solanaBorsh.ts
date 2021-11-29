import {
  serialize,
  BinaryWriter,
  BinaryReader,
  deserializeUnchecked,
} from 'borsh';

type NonFunctionPropertyNames<T> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

export abstract class BorshBase {
  encode(): Buffer {
    return Buffer.from(serialize(SCHEMA, this));
  }

  static decode<T extends Assignable<T>>(data: Buffer, tCons: Cons<T>): T {
    return deserializeUnchecked(SCHEMA, tCons, data);
  }
}

// Class wrapping a plain object
export abstract class Assignable<Self> extends BorshBase {
  constructor(props: { [P in NonFunctionPropertyNames<Self>]: Self[P] }) {
    super();
    (Object.keys(props) as Array<keyof this>).forEach(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore this is okay as long as Self == this
      (key) => (this[key] = props[key])
    );
  }
}

type OnlyOne<Union extends keyof Self, Self> = {
  [P in Union]: Required<Record<P, Self[P]>> & {
    [K in Exclude<Union, P>]?: never;
  };
}[Union];

// Class representing a Rust-compatible enum, since enums are only strings or
// numbers in pure JS
export abstract class Enum<Self> extends BorshBase {
  _enum: keyof this;

  //TODO: Find a way to do the one property check with types
  protected constructor(
    props: OnlyOne<Exclude<NonFunctionPropertyNames<Self>, '_enum'>, Self>
  ) {
    super();
    let key: keyof this | undefined;
    for (const prop of Object.keys(props) as Array<keyof this>) {
      if (prop) {
        if (key) {
          throw new Error('Multiple variants for enum');
        } else {
          key = prop;
        }
      }
    }

    if (!key) {
      throw new Error('No variants passed to enum');
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore this is okay as long as Self == this
    this[key] = props[key];
    this._enum = key;
  }
}

export class UnitValue extends BorshBase {
  // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
  borshSerialize(_writer: BinaryWriter): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static borshDeserialize(_reader: BinaryReader): UnitValue {
    return new UnitValue();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line
  | Cons<any>;
export type ArrayedFieldType = [FieldType] | [number] | [FieldType, number];

export function add_struct_to_schema<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Assignable<T> & Record<string, any>
>(
  cons: Cons<T>,
  fields: { [P in NonFunctionPropertyNames<T>]: FieldType | ArrayedFieldType }
): void {
  SCHEMA.set(cons, {
    kind: 'struct',
    fields: Object.entries(fields),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function add_enum_to_schema<T extends Enum<T> & Record<string, any>>(
  cons: Cons<T>,
  values: {
    [P in Exclude<NonFunctionPropertyNames<T>, '_enum'>]:
      | FieldType
      | ArrayedFieldType;
  }
): void {
  SCHEMA.set(cons, {
    kind: 'enum',
    field: 'enum',
    values: Object.entries(values),
  });
}

export interface CustomSerializer {
  borshSerialize(writer: BinaryWriter): void;
}
export interface CustomDeserializer<T> {
  borshDeserialize(reader: BinaryReader): T;
}

export function add_custom_to_schema<T extends CustomSerializer & BorshBase>(
  cons: Cons<T> & CustomDeserializer<T>
): void {
  SCHEMA.set(cons, { kind: 'custom' });
}

const SCHEMA: Map<
  // eslint-disable-next-line
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
  | {
      kind: 'custom';
    }
> = new Map();

export class AssignableBoolean extends BorshBase {
  value: boolean;

  constructor(value: boolean) {
    super();
    this.value = value;
  }

  static fromBoolean(value: boolean): AssignableBoolean {
    return new AssignableBoolean(value);
  }

  toBoolean(): boolean {
    return this.value;
  }

  borshSerialize(writer: BinaryWriter): void {
    writer.maybeResize();
    writer.writeU8(this.value ? 1 : 0);
  }
  static borshDeserialize(reader: BinaryReader): AssignableBoolean {
    return new AssignableBoolean(reader.readU8() != 0);
  }
}

export class AssignableI8 extends BorshBase {
  value: number;

  constructor(value: number) {
    super();
    this.value = value;
  }

  static fromNumber(value: number): AssignableI8 {
    return new AssignableI8(value);
  }

  toNumber(): number {
    return this.value;
  }

  borshSerialize(writer: BinaryWriter): void {
    writer.maybeResize();
    writer.buf.writeInt8(this.value, writer.length);
    writer.length += 1;
  }
  static borshDeserialize(reader: BinaryReader): AssignableI8 {
    const value = reader.buf.readInt8(reader.offset);
    reader.offset += 1;
    return new AssignableI8(value);
  }
}

export class AssignableI16 extends BorshBase {
  value: number;

  constructor(value: number) {
    super();
    this.value = value;
  }

  static fromNumber(value: number): AssignableI16 {
    return new AssignableI16(value);
  }

  toNumber(): number {
    return this.value;
  }

  borshSerialize(writer: BinaryWriter): void {
    writer.maybeResize();
    writer.buf.writeInt16LE(this.value, writer.length);
    writer.length += 2;
  }
  static borshDeserialize(reader: BinaryReader): AssignableI16 {
    const value = reader.buf.readInt16LE(reader.offset);
    reader.offset += 2;
    return new AssignableI16(value);
  }
}

export class AssignableI32 extends BorshBase {
  value: number;

  constructor(value: number) {
    super();
    this.value = value;
  }

  static fromNumber(value: number): AssignableI32 {
    return new AssignableI32(value);
  }

  toNumber(): number {
    return this.value;
  }

  borshSerialize(writer: BinaryWriter): void {
    writer.maybeResize();
    writer.buf.writeInt32LE(this.value, writer.length);
    writer.length += 4;
  }
  static borshDeserialize(reader: BinaryReader): AssignableI32 {
    const value = reader.buf.readInt32LE(reader.offset);
    reader.offset += 4;
    return new AssignableI32(value);
  }
}

export class AssignableI64 extends BorshBase {
  value!: bigint;

  constructor(value: bigint) {
    super();
    this.value = value;
  }

  static fromBigint(value: bigint): AssignableI64 {
    return new AssignableI64(value);
  }

  toBigint(): bigint {
    return this.value;
  }

  borshSerialize(writer: BinaryWriter): void {
    writer.maybeResize();
    writer.buf.writeBigInt64LE(this.value, writer.length);
    writer.length += 8;
  }
  static borshDeserialize(reader: BinaryReader): AssignableI64 {
    const value = reader.buf.readBigInt64LE(reader.offset);
    reader.offset += 8;
    return new AssignableI64(value);
  }
}

add_custom_to_schema(UnitValue);
add_custom_to_schema(AssignableBoolean);
add_custom_to_schema(AssignableI8);
add_custom_to_schema(AssignableI16);
add_custom_to_schema(AssignableI32);
add_custom_to_schema(AssignableI64);
