import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { Cryptid } from '../../../src';
import { SimpleCryptid } from '../../../src/api/SimpleCryptid';
import { Connection, Keypair, Transaction } from '@solana/web3.js';
import { did, makeKeypair } from '../../utils/did';
import { normalizeSigner } from '../../../src/lib/util';
import * as DirectExecute from '../../../src/lib/solana/transactions/DirectExecute';

chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
// const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('SimpleCryptid', () => {
  let keypair: Keypair;
  let cryptid: Cryptid;

  beforeEach(() => {
    keypair = makeKeypair();
    cryptid = new SimpleCryptid(did(keypair), normalizeSigner(keypair), {
      connection: {} as Connection,
    });
  });

  afterEach(sandbox.restore);

  it('should delegate to directExecute', async () => {
    const dummyTx = new Transaction();

    const expectation = sandbox.mock(DirectExecute).expects('directExecute');

    await cryptid.sign(dummyTx);

    expectation.verify();
  });
});
