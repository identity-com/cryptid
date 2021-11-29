import { range } from 'ramda';
import { expect } from 'chai';
import InstructionData from '../../../../../src/lib/solana/model/InstructionData';
import { randomTransactionAccountMeta } from './TransactionAccountMeta.test';
import { randomArray, randomAssignableBuffer, randomU8 } from '../util.test';

export function randomInstructionData(): InstructionData {
  return new InstructionData({
    program_id: randomU8(),
    accounts: randomArray(() => randomTransactionAccountMeta(), 0, 10),
    data: randomAssignableBuffer(0, 100),
  });
}

describe('InstructionData serde', function () {
  it('should serde a InstructionData', function () {
    range(0, 100).map(() => {
      const before = randomInstructionData();
      const data = before.encode();
      const after = InstructionData.decode(data, InstructionData);

      expect(after).to.deep.equal(before);
    });
  });
});
