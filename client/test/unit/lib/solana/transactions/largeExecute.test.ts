import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import { recentBlockhash } from '../../../../utils/solana';
import { publicKeyToDid } from '../../../../../src/lib/solana/util';
// import {
//   normalizeSigner,
// } from '../../../../../src/lib/util';
import { stubGetBlockhash } from '../../../../utils/lang';
import { normalizeSigner } from '../../../../../src/lib/util';
import { largeExecute } from '../../../../../src/lib/solana/transactions/largeExecute';

chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('transactions/largeExecute', () => {
  const payer = Keypair.generate();
  const did = publicKeyToDid(payer.publicKey);

  beforeEach(() => stubGetBlockhash(sandbox));
  afterEach(sandbox.restore);

  const makeSimpleTransaction = async (): Promise<Transaction> =>
    new Transaction({
      recentBlockhash: await recentBlockhash(),
    }).add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        lamports: 0,
        toPubkey: payer.publicKey,
      })
    );

  it('should create and sign a largeExecute transaction', async () => {
    const txToWrap = await makeSimpleTransaction();
    const { setupTransactions, executeTransaction } = await largeExecute(
      txToWrap,
      did,
      payer.publicKey,
      [normalizeSigner(payer)]
    );
    expect(setupTransactions).to.have.lengthOf(1);

    expect(setupTransactions[0].signatures).to.have.length(1);
    expect(setupTransactions[0].signatures[0].publicKey.toString()).to.equal(
      payer.publicKey.toString()
    );

    expect(executeTransaction.signatures).to.have.length(1);
    expect(executeTransaction.signatures[0].publicKey.toString()).to.equal(
      payer.publicKey.toString()
    );
    expect(did).to.not.be.undefined;
    expect(txToWrap).to.not.be.undefined;
  });
});
