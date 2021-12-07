import TransactionState from '../../../../../src/lib/solana/model/TransactionState';
import { randomInt } from 'crypto';
import { UnitValue } from '../../../../../src/lib/solana/solanaBorsh';
import { range } from 'ramda';
import { expect } from 'chai';

export function randomTransactionState(): TransactionState {
  switch (randomInt(0, 3)) {
    case 0:
      return new TransactionState({ notReady: new UnitValue() });
    case 1:
      return new TransactionState({ ready: new UnitValue() });
    case 2:
      return new TransactionState({ executed: new UnitValue() });
    default:
      throw new Error('Bad value for randomTransactionState');
  }
}

describe('TransactionState serde', function () {
  it('should serde a TransactionState', function () {
    range(0, 100).map(() => {
      const before = randomTransactionState();
      const data = before.encode();
      const after = TransactionState.decode(data, TransactionState);

      expect(after).to.deep.equal(before);
    });
  });
});
