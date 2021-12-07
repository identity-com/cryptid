import { range } from 'ramda';
import { randomInt } from 'crypto';
import { expect } from 'chai';
import TransactionAccount, {
  TransactionAccountSigner,
} from '../../../../../src/lib/solana/accounts/TransactionAccount';
import { randomDiscriminant } from './Discriminant.test';
import { U16_BOUNDS } from '../../../../../src/lib/solana/solanaBorsh';
import { randomTransactionState } from '../model/TransactionState.test';
import { randomAssignablePublicKey } from '../model/AssignablePublickey.test';
import { randomSigningKeyData } from '../model/SigningKeyData.test';
import { randomInstructionData } from '../model/InstructionData.test';
import { randomArray, randomAssignableI64 } from '../util.test';

export function randomTransactionAccount(): TransactionAccount {
  return new TransactionAccount({
    accounts: randomArray(randomAssignablePublicKey, 1, 10),
    cryptidAccount: randomAssignablePublicKey(),
    discriminant: randomDiscriminant(),
    settingsSequence: randomInt(0, U16_BOUNDS.max + 1),
    signers: randomArray(randomTransactionAccountSigner, 1, 3),
    state: randomTransactionState(),
    transactionInstructions: randomArray(randomInstructionData, 0, 10),
  });
}

export function randomTransactionAccountSigner(): TransactionAccountSigner {
  return new TransactionAccountSigner({
    signerData: randomSigningKeyData(),
    expireTime: randomAssignableI64(),
  });
}

describe('TransactionAccount serde', function () {
  it('should serde a TransactionAccount', function () {
    range(0, 100).map(() => {
      const before = randomTransactionAccount();
      const data = before.encode();
      const after = TransactionAccount.decode(data, TransactionAccount);

      expect(after).to.deep.equal(before);
    });
  });

  it('should serde a TransactionAccountSigner', function () {
    range(0, 100).map(() => {
      const before = randomTransactionAccountSigner();
      const data = before.encode();
      const after = TransactionAccountSigner.decode(
        data,
        TransactionAccountSigner
      );

      expect(after).to.deep.equal(before);
    });
  });
});
