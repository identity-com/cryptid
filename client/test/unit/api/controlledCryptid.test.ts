import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { Cryptid } from '../../../src';
import { SimpleCryptid } from '../../../src/api/simpleCryptid';
import { Connection, Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import { did, makeKeypair } from '../../utils/did';
import { normalizeSigner } from '../../../src/lib/util';
import { CryptidOptions } from '../../../src/api/cryptid';
import { didToPDA } from '../../../src/lib/solana/util';
import * as DirectExecute from '../../../src/lib/solana/transactions/directExecute';
import * as Util from '../../../src/lib/util';

chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('SimpleCryptid', () => {
  let keypair: Keypair;
  let cryptid: Cryptid;
  let controlledCryptid: Cryptid;
  let controllerKeypair: Keypair;

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
    controllerKeypair = makeKeypair();
    controlledCryptid = cryptid.as(did(controllerKeypair));
  });

  afterEach(sandbox.restore);

  context('controller', () => {
    it('should return a new controlledCryptid interface when called with as()', async () => {
      const newController = 'did:sol:controller';
      const updatedCrypid = await controlledCryptid.as(newController);
      expect(updatedCrypid.did).to.equal(newController);
      // existing interface still has previous did as controller.
      expect(controlledCryptid.did).to.equal(did(controllerKeypair));
    });
  });

  context('additionalKeys', () => {
    it('base interface has no additionalKeys', async () => {
      expect(await cryptid.additionalKeys()).to.deep.equal([]);
    });

    it('first controller interface has one additionalKeys object', async () => {
      expect(await controlledCryptid.additionalKeys()).to.deep.equal([
        await didToPDA(did(keypair)),
      ]);
    });

    it('second controller interface has two additionalKeys objects', async () => {
      const keypair2 = makeKeypair();
      const crytid2 = controlledCryptid.as(did(keypair2));
      expect(await crytid2.additionalKeys()).to.deep.equal([
        await didToPDA(did(keypair)),
        await didToPDA(did(controllerKeypair)),
      ]);
    });
  });

  context('sign', () => {
    it('should delegate to directExecute', async () => {
      const dummyTx = new Transaction({ recentBlockhash: 'HCSZfZ2m2XXPQYXiev6ZLiRQJTFqTCm43LGsvztUUyFW' }).add(
        SystemProgram.transfer({
          lamports: 0,
          fromPubkey: keypair.publicKey,
          toPubkey: keypair.publicKey,
        })
      );
      const spyDirectExecute = sandbox.spy(DirectExecute, 'directExecute');
      const spyIsCorrectSize = sandbox.spy(Util, 'isCorrectSize');

      await controlledCryptid.sign(dummyTx);

      // spyDirectExecute.restore();
      // spyIsCorrectSize.restore();
      sandbox.assert.calledOnce(spyDirectExecute);
      sandbox.assert.calledOnce(spyIsCorrectSize);
    });
  });

  context('signer', () => {
    it('should update signer of base cryptid', async () => {
      const newKeypair = makeKeypair();
      controlledCryptid.updateSigner(normalizeSigner(newKeypair));
      expect(cryptid.signer.publicKey).to.deep.equal(newKeypair.publicKey);
    });
  });
});
