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
import * as DirectExecute from '../../../src/lib/solana/transactions/directExecute';
import * as AddKey from '../../../src/lib/solana/transactions/did/addKey';
import {pubkey} from "../../utils/solana";
import {decode} from "bs58";
import {CryptidOptions} from "../../../src/api/cryptid";

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
      connection: new Connection('http://whatever.test'),
      ...options
    })

  beforeEach(() => {
    sandbox.stub(Connection.prototype, 'sendRawTransaction').resolves('txSig')
    sandbox.stub(Transaction.prototype, 'serialize')

    keypair = makeKeypair();
    cryptid = makeCryptid();
  });

  afterEach(sandbox.restore);

  context('sign', () => {
    it('should delegate to directExecute', async () => {
      const dummyTx = new Transaction();

      const expectation = sandbox.mock(DirectExecute).expects('directExecute');

      await cryptid.sign(dummyTx);

      expectation.verify();
    });
  });

  context('addKey', () => {
    it('should delegate to addKey', async () => {
      const expectation = sandbox.mock(AddKey).expects('addKey')
      expectation.resolves(new Transaction());

      await cryptid.addKey(pubkey(), 'alias');

      expectation.verify();
    });

    it('should wait for the confirmation if cryptid is configured too do so', async () => {
      const expectation = sandbox.mock(Connection.prototype).expects('confirmTransaction')
      sandbox.stub(AddKey, 'addKey').resolves(new Transaction());

      cryptid =  makeCryptid(keypair, { waitForConfirmation: true })

      await cryptid.addKey(pubkey(), 'alias');

      expectation.verify();
    });
  });

  context('address', () => {
    it('should return the default doa signer address', async () => {
      // creating with a controlled key so we can control the output
      const secret = '2Ki6LaRSuUPdGfEC89pdC7w5RB5gY3FmXUQWkVywqhYxvQEy4fTajNcTvY5ciQVvVMqE4nTbRCehNynwN2dBYRPa';
      keypair = Keypair.fromSecretKey(decode(secret))
      cryptid =  makeCryptid()

      const address = await cryptid.address();
      expect(address.toBase58()).to.equal('3m1ckJAArX6chLupHHbhiEDkzJdqTEXTHNYQdid2xbgm')
    });
  });

  context('document', () => {
    it('should resolve the DID and return the document', async () => {
      const document = await cryptid.document();

      expect(document.verificationMethod).to.containSubset([{
        id: `${did(keypair)}#default`,
        type: 'Ed25519VerificationKey2018',
        controller: did(keypair),
        publicKeyBase58: keypair.publicKey.toBase58()
      }])
    });
  });
});
