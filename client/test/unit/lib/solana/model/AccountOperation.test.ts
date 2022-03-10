import { range } from 'ramda';
import { expect } from 'chai';
import AccountOperation from '../../../../../src/lib/solana/model/AccountOperation';
import { randomInt } from 'crypto';
import { randomAssignablePublicKey } from './AssignablePublicKey.test';
import { UnitValue } from '../../../../../src/lib/solana/solanaBorsh';

export function randomAccountOperation(): AccountOperation {
  switch (randomInt(0, 3)) {
    case 0:
      return new AccountOperation({ add: randomAssignablePublicKey() });
    case 1:
      return new AccountOperation({ clear: new UnitValue() });
    case 2:
      return new AccountOperation({
        addMany: range(0, randomInt(1, 10)).map(randomAssignablePublicKey),
      });
    default:
      throw new Error('Invalid value for randomAccountOperation');
  }
}

describe('TransactionState serde', function () {
  it('should serde a TransactionState', function () {
    range(0, 100).map(() => {
      const before = randomAccountOperation();
      const data = before.encode();
      const after = AccountOperation.decode(data, AccountOperation);

      expect(after).to.deep.equal(before);
    });
  });
});
