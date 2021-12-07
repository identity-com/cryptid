import { range } from 'ramda';
import { expect } from 'chai';
import InstructionOperation, {
  AddAccount,
  AddAccounts,
  AddData,
} from '../../../../../src/lib/solana/model/InstructionOperation';
import { randomInt } from 'crypto';
import { randomInstructionData } from './InstructionData.test';
import { UnitValue } from '../../../../../src/lib/solana/solanaBorsh';
import { randomTransactionAccountMeta } from './TransactionAccountMeta.test';
import { randomArray, randomAssignableBuffer, randomU8 } from '../util.test';

export function randomInstructionOperation(): InstructionOperation {
  switch (randomInt(0, 8)) {
    case 0:
      return new InstructionOperation({ push: randomInstructionData() });
    case 1:
      return new InstructionOperation({ pop: new UnitValue() });
    case 2:
      return new InstructionOperation({ addAccount: randomAddAccount() });
    case 3:
      return new InstructionOperation({
        addAccounts: randomAddAccounts(),
      });
    case 4:
      return new InstructionOperation({ clearAccounts: randomU8() });
    case 5:
      return new InstructionOperation({ addData: randomAddData() });
    case 6:
      return new InstructionOperation({ clearData: randomU8() });
    case 7:
      return new InstructionOperation({ clear: new UnitValue() });
    default:
      throw new Error('Invalid value for randomInstructionOperation');
  }
}

export function randomAddAccount(): AddAccount {
  return new AddAccount({
    index: randomU8(),
    account: randomTransactionAccountMeta(),
  });
}

export function randomAddAccounts(): AddAccounts {
  return new AddAccounts({
    index: randomU8(),
    accounts: randomArray(() => randomTransactionAccountMeta(), 0, 10),
  });
}

export function randomAddData(): AddData {
  return new AddData({
    index: randomU8(),
    data: randomAssignableBuffer(0, 100),
  });
}

describe('InstructionOperation serde', function () {
  it('should serde a InstructionOperation', function () {
    range(0, 100).map(() => {
      const before = randomInstructionOperation();
      const data = before.encode();
      const after = InstructionOperation.decode(data, InstructionOperation);

      expect(after).to.deep.equal(before);
    });
  });
});
