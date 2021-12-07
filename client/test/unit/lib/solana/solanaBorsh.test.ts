import {
  AssignableBoolean,
  AssignableBuffer,
  AssignableI16,
  AssignableI32,
  AssignableI64,
  AssignableI8,
  I32_BOUNDS,
  I16_BOUNDS,
  I8_BOUNDS,
  UnitValue,
} from '../../../../src/lib/solana/solanaBorsh';
import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import { range } from 'ramda';
import * as crypto from 'crypto';
import { randomAssignableBuffer } from './util.test';

chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;

// Borsh spec ref: https://borsh.io/
describe('solanaBorsh', function () {
  it('should serde UnitValue', function () {
    const before = new UnitValue();

    const data = before.encode();
    expect(data.length).to.equal(0); // Borsh spec
    const after = UnitValue.decode(data, UnitValue);

    expect(before).to.deep.equal(after);
  });

  it('should serde AssignableBoolean', function () {
    for (const index of range(0, 2)) {
      const before = AssignableBoolean.fromBoolean(index === 1);
      expect(before.toBoolean()).to.equal(index === 1);

      const data = before.encode();
      expect(data.length).to.equal(1); // Borsh spec
      expect(data.readUInt8()).to.equal(index); // Borsh spec

      const after = AssignableBoolean.decode(data, AssignableBoolean);
      expect(before).to.deep.equal(after);
      expect(before.toBoolean()).to.equal(after.toBoolean());
    }
  });

  it('should serde AssignableI8', function () {
    range(I8_BOUNDS.min, I8_BOUNDS.max + 1).forEach((value) => {
      const before = AssignableI8.fromNumber(value);
      expect(before.toNumber()).to.equal(value);

      const data = before.encode();
      expect(data.length).to.equal(1); // Borsh spec
      expect(data.readInt8()).to.equal(value); // Borsh spec

      const after = AssignableI8.decode(data, AssignableI8);
      expect(after).to.deep.equal(before);
      expect(after.toNumber()).to.equal(before.toNumber());
    });
  });

  it('should serde AssignableI16', function () {
    this.timeout(20000);
    range(I16_BOUNDS.min, I16_BOUNDS.max + 1).forEach((value) => {
      const before = AssignableI16.fromNumber(value);
      expect(before.toNumber()).to.equal(value);

      const data = before.encode();
      expect(data.length).to.equal(2); // Borsh spec
      expect(data.readInt16LE()).to.equal(value); // Borsh spec

      const after = AssignableI16.decode(data, AssignableI16);
      expect(after).to.deep.equal(before);
      expect(after.toNumber()).to.equal(before.toNumber());
    });
  });

  it('should serde AssignableI32', function () {
    const max = 157;
    range(0, max).forEach((n) => {
      const value = Math.floor(
        (n * (I32_BOUNDS.max - I32_BOUNDS.min)) / max + I32_BOUNDS.min
      );
      const before = AssignableI32.fromNumber(value);
      expect(before.toNumber()).to.equal(value);

      const data = before.encode();
      expect(data.length).to.equal(4); // Borsh spec
      expect(data.readInt32LE()).to.equal(value); // Borsh spec

      const after = AssignableI32.decode(data, AssignableI32);
      expect(after).to.deep.equal(before);
      expect(after.toNumber()).to.equal(before.toNumber());
    });
  });

  it('should serde AssignableI64', function () {
    range(0, 100).forEach(() => {
      const value = crypto.randomBytes(8).readBigInt64LE();
      const before = AssignableI64.fromBigint(value);
      expect(before.toBigint()).to.equal(value);

      const data = before.encode();
      expect(data.length).to.equal(8); // Borsh spec
      expect(data.readBigInt64LE()).to.equal(value); // Borsh spec

      const after = AssignableI64.decode(data, AssignableI64);
      expect(after).to.deep.equal(before);
      expect(after.toBigint()).to.equal(before.toBigint());
    });
  });

  it('should serde AssignableBuffer', function () {
    range(0, 100).forEach(() => {
      const before = randomAssignableBuffer(0, 100);

      const data = before.encode();
      expect(data.length).to.equal(4 + before.buffer.length); // Borsh spec
      expect(data.readInt32LE()).to.equal(before.buffer.length); // Borsh spec

      const after = AssignableBuffer.decode(data, AssignableBuffer);
      expect(after).to.deep.equal(before);
      expect(after.toBuffer()).to.deep.equal(before.toBuffer());
    });
  });
});
