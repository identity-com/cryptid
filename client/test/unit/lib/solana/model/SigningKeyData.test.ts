import { randomInt } from 'crypto';
import { range } from 'ramda';
import { expect } from 'chai';
import SigningKeyData from '../../../../../src/lib/solana/model/SigningKeyData';
import { randomAssignablePublicKey } from './AssignablePublickey.test';

export function randomSigningKeyData(): SigningKeyData {
  return new SigningKeyData({
    key: randomAssignablePublicKey(),
    extraKeys: range(0, randomInt(0, 3)).map(randomAssignablePublicKey),
  });
}

describe('SigningKeyData serde', function () {
  it('should serde a SigningKeyData', function () {
    range(0, 100).map(() => {
      const before = randomSigningKeyData();
      const data = before.encode();
      const after = SigningKeyData.decode(data, SigningKeyData);

      expect(after).to.deep.equal(before);
    });
  });
});
