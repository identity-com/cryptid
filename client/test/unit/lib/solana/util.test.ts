import {
  AssignableBoolean,
  AssignableBuffer,
  AssignableI16,
  AssignableI32,
  AssignableI64,
  AssignableI8,
  Bounds,
  I16_BOUNDS,
  I32_BOUNDS,
  I8_BOUNDS,
  U16_BOUNDS,
  U32_BOUNDS,
  U8_BOUNDS,
} from '../../../../src/lib/solana/solanaBorsh';
import { range } from 'ramda';
import crypto, { randomInt } from 'crypto';

export function randomAssignableBoolean(): AssignableBoolean {
  return AssignableBoolean.fromBoolean(randomInt(0, 2) === 1);
}
function randomBoundedInt(bounds: Bounds<number>): number {
  return randomInt(bounds.min, bounds.max + 1);
}
export function randomAssignableI8(): AssignableI8 {
  return AssignableI8.fromNumber(randomBoundedInt(I8_BOUNDS));
}
export function randomAssignableI16(): AssignableI16 {
  return AssignableI16.fromNumber(randomBoundedInt(I16_BOUNDS));
}
export function randomAssignableI32(): AssignableI32 {
  return AssignableI32.fromNumber(randomBoundedInt(I32_BOUNDS));
}
export function randomAssignableI64(): AssignableI64 {
  return AssignableI64.fromBigint(crypto.randomBytes(8).readBigInt64LE());
}
export function randomU8(): number {
  return randomBoundedInt(U8_BOUNDS);
}
export function randomU16(): number {
  return randomBoundedInt(U16_BOUNDS);
}
export function randomU32(): number {
  return randomBoundedInt(U32_BOUNDS);
}
export function randomU64(): bigint {
  let value = crypto.randomBytes(8).readBigInt64LE();
  if (value < 0) {
    value = -value;
  }
  return value;
}
export function randomAssignableBuffer(
  min: number,
  max: number
): AssignableBuffer {
  return new AssignableBuffer(
    Buffer.from(range(0, randomInt(min, max)).map(randomU8))
  );
}
export function randomArray<T>(
  func: (index: number) => T,
  min: number,
  max: number
): T[] {
  return range(0, randomInt(min, max)).map(func);
}
