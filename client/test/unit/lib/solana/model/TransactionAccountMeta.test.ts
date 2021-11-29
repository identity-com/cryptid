import { range } from 'ramda';
import { expect } from 'chai';
import TransactionAccountMeta from '../../../../../src/lib/solana/model/TransactionAccountMeta';
import { randomInt } from 'crypto';
import { U8_BOUNDS } from '../../../../../src/lib/solana/solanaBorsh';

export function randomTransactionAccountMeta(props?: {
  accountsNum?: number;
  isSigner?: boolean;
  isWritable?: boolean;
}): TransactionAccountMeta {
  return TransactionAccountMeta.fromIndexAndMeta(
    randomInt(
      0,
      props && props.accountsNum ? props.accountsNum : U8_BOUNDS.max + 1
    ),
    props && props.isSigner ? props.isSigner : randomInt(0, 2) === 1,
    props && props.isWritable ? props.isWritable : randomInt(0, 2) === 1
  );
}

describe('randomTransactionAccountMeta serde', function () {
  it('should serde a randomTransactionAccountMeta', function () {
    range(0, 100).map(() => {
      const before = randomTransactionAccountMeta();
      const data = before.encode();
      const after = TransactionAccountMeta.decode(data, TransactionAccountMeta);

      expect(after).to.deep.equal(before);
    });
  });
});
