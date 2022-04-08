import { range } from 'ramda';
import Discriminant from '../../../../../src/lib/solana/accounts/Discriminant';
import { randomInt } from 'crypto';
import { expect } from 'chai';

export function randomDiscriminant(): Discriminant {
  return new Discriminant({ value: randomInt(0, 256) });
}

describe('Discriminant serde', function () {
  it('should serde a Discriminant', function () {
    range(0, 100).map(() => {
      const before = randomDiscriminant();
      const data = before.encode();
      const after = Discriminant.decode(data, Discriminant);

      expect(after).to.deep.equal(before);
    });
  });
});
