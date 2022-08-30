import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { Cryptid, Signer } from '../../../src';
import { SimpleCryptid } from '../../../src/api/simpleCryptid';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { did, makeKeypair, makeService } from '../../utils/did';
import { normalizeSigner } from '../../../src/lib/util';
import * as DirectExecute from '../../../src/lib/solana/transactions/directExecute';
import * as Util from '../../../src/lib/util';
import * as AddKey from '../../../src/lib/solana/transactions/did/addKey';
import { pubkey } from '../../utils/solana';
import { decode } from 'bs58';
import { CryptidOptions, PayerOption } from '../../../src/api/cryptid';

chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('SimpleCryptid', () => {
  let keypair: Keypair;
  let cryptid: Cryptid;

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
  });

  afterEach(sandbox.restore);

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

      await cryptid.sign(dummyTx);

      spyDirectExecute.restore();
      spyIsCorrectSize.restore();
      sandbox.assert.calledOnce(spyDirectExecute);
      sandbox.assert.calledOnce(spyIsCorrectSize);
    });
  });

  context('addKey', () => {
    it('should delegate to addKey', async () => {
      const expectation = sandbox.mock(AddKey).expects('addKey');
      expectation.resolves(new Transaction());

      await cryptid.addKey(pubkey(), 'alias');

      expectation.verify();
    });

    it('should wait for the confirmation if cryptid is configured to do so', async () => {
      const expectation = sandbox
        .mock(Connection.prototype)
        .expects('confirmTransaction');
      sandbox.stub(AddKey, 'addKey').resolves(new Transaction());

      cryptid = makeCryptid(keypair, { waitForConfirmation: true });

      await cryptid.addKey(pubkey(), 'alias');

      expectation.verify();
    });

    it('should pass the user key as the payer if SIGNER_PAYS is true', async () => {
      const expectation = sandbox
        .mock(AddKey)
        .expects('addKey')
        .withArgs(
          sandbox.match.instanceOf(Connection),
          did(keypair),
          sandbox.match((signer: Signer) =>
            signer.publicKey.equals(keypair.publicKey)
          ),
          sandbox.match.instanceOf(PublicKey),
          'alias',
          sandbox.match((authority: PublicKey) =>
            authority.equals(keypair.publicKey)
          )
        );
      expectation.resolves(new Transaction());

      cryptid = makeCryptid(keypair, { rentPayer: 'SIGNER_PAYS' });
      await cryptid.addKey(pubkey(), 'alias');
      expectation.verify();
    });

    it('should throw an error if the ret payer is not recognised', async () => {
      cryptid = makeCryptid(keypair, {
        rentPayer: 'unrecognised' as PayerOption,
      });

      const shouldFail = cryptid.addKey(pubkey(), 'alias');

      return expect(shouldFail).to.be.rejectedWith(/Unsupported payer option/);
    });
  });

  context('address', () => {
    it('should return the default cryptid signer address', async () => {
      // creating with a controlled key so we can control the output
      const secret =
        '2Ki6LaRSuUPdGfEC89pdC7w5RB5gY3FmXUQWkVywqhYxvQEy4fTajNcTvY5ciQVvVMqE4nTbRCehNynwN2dBYRPa';
      keypair = Keypair.fromSecretKey(decode(secret));
      cryptid = makeCryptid();

      const address = await cryptid.address();
      expect(address.toBase58()).to.equal(
        'FHyWGTKCbAFFFYJU3qw5EaUvGzDfpCWzYfauxp5mrUmo'
      );
    });
  });

  context('document', () => {
    it('should resolve the DID and return the document', async () => {
      sandbox.stub(Connection.prototype, 'getAccountInfo').resolves(null);

      const document = await cryptid.document();

      expect(document.verificationMethod).to.containSubset([
        {
          id: `${did(keypair)}#default`,
          type: 'Ed25519VerificationKey2018',
          controller: did(keypair),
          publicKeyBase58: keypair.publicKey.toBase58(),
        },
      ]);
    });
  });

  context('controller', () => {
    it('should return a new controlledCryptid interface when called with as()', async () => {
      const newController = 'did:sol:controller';
      const updatedCrypid = await cryptid.as(newController);
      expect(updatedCrypid.did).to.equal(newController);
      // existing interface still has previous did as controller.
      expect(cryptid.did).to.equal(did(keypair));
    });
  });

  context('signer', () => {
    it('should update signer', async () => {
      const newKeypair = makeKeypair();
      cryptid.updateSigner(normalizeSigner(newKeypair));
      expect(cryptid.signer.publicKey).to.deep.equal(newKeypair.publicKey);
    });
  });
});
