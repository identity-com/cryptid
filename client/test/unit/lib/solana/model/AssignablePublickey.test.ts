import { range } from 'ramda';
import { expect } from 'chai';
import AssignablePublicKey from '../../../../../src/lib/solana/model/AssignablePublicKey';
import { randomU8 } from '../util.test';

export function randomAssignablePublicKey(): AssignablePublicKey {
  return new AssignablePublicKey({
    bytes: range(0, 32).map(() => randomU8()),
  });
}

describe('AssignablePublicKey serde', function () {
  it('should serde a AssignablePublicKey', function () {
    range(0, 100).map(() => {
      const before = randomAssignablePublicKey();
      const data = before.encode();
      const after = AssignablePublicKey.decode(data, AssignablePublicKey);

      expect(after).to.deep.equal(before);
    });
  });
});
