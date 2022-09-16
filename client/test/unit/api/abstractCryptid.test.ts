import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { Cryptid } from '../../../src';
import { SimpleCryptid } from '../../../src/api/simpleCryptid';
import { Connection, Keypair, Transaction } from '@solana/web3.js';
import { did, makeKeypair } from '../../utils/did';
import { normalizeSigner } from '../../../src/lib/util';
import { CryptidOptions } from '../../../src/api/cryptid';

chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('abstractCryptid', () => {
    let keypair: Keypair;
    let cryptid: Cryptid;
    let abstractCryptid: Cryptid;
    let abstractKeypair: Keypair;

    const makeCryptid = (key = keypair, options: Partial<CryptidOptions> = {}) =>
    new SimpleCryptid(did(key), normalizeSigner(key), {
      connection: new Connection('http://whatever.test', 'confirmed'),
      ...options,
    });

  beforeEach(() => {
    sandbox.stub(Connection.prototype, 'sendRawTransaction').resolves('txSig');
    sandbox.stub(Transaction.prototype, 'serialize');

    keypair = makeKeypair();
    cryptid = makeCryptid();
    abstractKeypair = makeKeypair();
    abstractCryptid = cryptid.as(did(abstractKeypair));
  });

  afterEach(sandbox.restore);

  context('abstract', () => {
    it('should return a new abstractCryptid interface when called with as()', async () => {
      const newController = 'did:sol:abstract';
      const updatedCrypid = await abstractCryptid.as(newController);
      expect(updatedCrypid.did).to.equal(newController);
      // existing interface still has previous did as controller.
      expect(abstractCryptid.did).to.equal(did(abstractKeypair));
    });
});
});
