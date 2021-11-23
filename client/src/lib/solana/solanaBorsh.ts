import { serialize, deserialize, BinaryWriter, BinaryReader } from 'borsh';

// Class wrapping a plain object
export abstract class Assignable<Self> {
  constructor(props: { [P in keyof Self]?: Self[P] }) {
    (Object.keys(props) as Array<keyof this>).forEach(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore this is okay as long as Self == this
      (key) => (this[key] = props[key])
    );
  }

  encode(): Buffer {
    return Buffer.from(serialize(SCHEMA, this));
  }

  static decode<T extends Assignable<T>>(data: Buffer, tCons: Cons<T>): T {
    return deserialize(SCHEMA, tCons, data);
  }
}

// Class representing a Rust-compatible enum, since enums are only strings or
// numbers in pure JS
export abstract class Enum<Self> {
  enum: keyof this;

  //TODO: Find a way to do the one property check with types
  protected constructor(props: { [P in keyof Self]?: Self[P] }) {
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
    this.enum = key;
  }

  encode(): Buffer {
    return Buffer.from(serialize(SCHEMA, this));
  }

  static decode<T extends Enum<T>>(data: Buffer, tCons: Cons<T>): T {
    return deserialize(SCHEMA, tCons, data);
  }
}

export class UnitValue extends Assignable<UnitValue> {
  // eslint-disable-next-line @typescript-eslint/ban-types
  constructor(props?: {}) {
    super(props ? props : {});
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
  borshSerialize(_writer: BinaryWriter): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static borshDeserialize(_reader: BinaryReader): UnitValue {
    return new UnitValue();
  }
}

// eslint-disable-next-line
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
export type ArrayedFieldType = [FieldType] | [number];

export function add_struct_to_schema<
  T extends Assignable<T>,
  V extends keyof T & string
>(cons: Cons<T>, fields: { [P in V]: FieldType | ArrayedFieldType }): void {
  SCHEMA.set(cons, {
    kind: 'struct',
    fields: (Object.keys(fields) as V[]).map((key) => [key, fields[key]]),
  });
}

export function add_enum_to_schema<
  T extends Enum<T>,
  V extends keyof T & string
>(cons: Cons<T>, values: { [P in V]: FieldType | ArrayedFieldType }): void {
  SCHEMA.set(cons, {
    kind: 'enum',
    field: 'enum',
    values: (Object.keys(values) as V[]).map((key) => [key, values[key]]),
  });
}

export interface CustomSerializer {
  borshSerialize(writer: BinaryWriter): void;
}
export interface CustomDeserializer<T> {
  borshDeserialize(reader: BinaryReader): T;
}

export function add_custom_to_schema<
  T extends (Assignable<T> | Enum<T>) & CustomSerializer
>(cons: Cons<T> & CustomDeserializer<T>): void {
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

export class AssignableBoolean extends Assignable<AssignableBoolean> {
  value!: boolean;

  constructor(props: { value: boolean }) {
    super(props);
  }

  static fromBoolean(value: boolean): AssignableBoolean {
    return new AssignableBoolean({ value });
  }

  toBoolean(): boolean {
    return this.value;
  }

  borshSerialize(writer: BinaryWriter): void {
    writer.maybeResize();
    writer.writeU8(this.value ? 1 : 0);
  }
  static borshDeserialize(reader: BinaryReader): AssignableBoolean {
    return new AssignableBoolean({ value: reader.readU8() != 0 });
  }
}

export class AssignableI8 extends Assignable<AssignableI8> {
  value!: number;

  constructor(props: { value: number }) {
    super(props);
  }

  static fromNumber(value: number): AssignableI8 {
    return new AssignableI8({ value });
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
    return new AssignableI8({ value });
  }
}

export class AssignableI16 extends Assignable<AssignableI8> {
  value!: number;

  constructor(props: { value: number }) {
    super(props);
  }

  static fromNumber(value: number): AssignableI16 {
    return new AssignableI16({ value });
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
    return new AssignableI16({ value });
  }
}

export class AssignableI32 extends Assignable<AssignableI8> {
  value!: number;

  constructor(props: { value: number }) {
    super(props);
  }

  static fromNumber(value: number): AssignableI32 {
    return new AssignableI32({ value });
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
    return new AssignableI32({ value });
  }
}

export class AssignableI64 extends Assignable<AssignableI64> {
  value!: bigint;

  constructor(props: { value: bigint }) {
    super(props);
  }

  static fromBigint(value: bigint): AssignableI64 {
    return new AssignableI64({ value });
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
    return new AssignableI64({ value });
  }
}

add_custom_to_schema(UnitValue);
add_custom_to_schema(AssignableBoolean);
add_custom_to_schema(AssignableI64);
