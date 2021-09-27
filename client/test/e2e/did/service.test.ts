import { build, Cryptid } from '../../../src';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { airdrop, Balances } from '../../utils/solana';
import { publicKeyToDid } from '../../../src/lib/solana/util';
import chai from 'chai';
import {ServiceEndpoint} from 'did-resolver';
import {
  expectDocumentNotToIncludeService,
  expectDocumentToIncludeKey,
  expectDocumentToIncludeService
} from "../../utils/did";

const { expect } = chai;

const TRANSACTION_FEE = 5000;

const alias = 'dummy'
const dummyService = (did: string):ServiceEndpoint => ({
  id: `${did}#${alias}`,
  type: alias,
  serviceEndpoint: alias,
  description: alias
});

describe('DID Service operations', function () {
  this.timeout(60_000);

  let connection: Connection;
  let balances: Balances;

  let key: Keypair;
  let did: string;
  let doaSigner: PublicKey;
  let cryptid: Cryptid;

  before(async () => {
    connection = new Connection('http://localhost:8899', 'confirmed');
  });

  beforeEach(async () => {
    key = Keypair.generate();
    did = publicKeyToDid(key.publicKey, 'localnet');

    cryptid = await build(did, key, {
      connection,
      waitForConfirmation: true,
    });
    doaSigner = await cryptid.address();

    await Promise.all([
      airdrop(connection, doaSigner), // the main funds for the cryptid account
      airdrop(connection, key.publicKey), // funds retained by the signer key
    ]);
  });

  context('addService', () => {
    beforeEach(async () => {
      balances = await new Balances(connection).register(
        doaSigner,
        key.publicKey,
      );
    });

    context('with a generative DID', () => {
      const [expectedFee, expectedRent] = [5000, 11330880];

      it('should register the DID and add a service', async () => {
        await cryptid.addService(dummyService(did));

        await balances.recordAfter();

        const document = await cryptid.document();
        expectDocumentToIncludeService(document, alias);

        // cryptid account paid rent
        expect(balances.for(doaSigner)).to.equal(-expectedRent);
        // signer paid fee
        expect(balances.for(key.publicKey)).to.equal(-expectedFee);
      });
    });

    context('with an anchored DID', () => {
      const addedKey = Keypair.generate().publicKey;

      beforeEach(async () => {
        // add a key to upgrade (anchor) the did
        await cryptid.addKey(addedKey, 'ledger');

        // re-record the before balances, now that everything is set up
        await balances.recordBefore();
      });

      it('should add a new service', async () => {
        await cryptid.addService(dummyService(did));

        await balances.recordAfter();

        const document = await cryptid.document();
        expectDocumentToIncludeService(document, alias);

        // check the key was not overwritten
        expectDocumentToIncludeKey(document, addedKey);

        // cryptid account paid nothing
        expect(balances.for(doaSigner)).to.equal(0);
        // signer paid fee
        expect(balances.for(key.publicKey)).to.equal(-TRANSACTION_FEE);
      });
    });
  });

  context('removeService', () => {
    beforeEach(async () => {
      // add a service to upgrade (anchor) the did
      await cryptid.addService(dummyService(did));

      balances = await new Balances(connection).register(
        doaSigner,
        key.publicKey,
      );
    });

    it('should remove the added service', async () => {
      await cryptid.removeService(alias);

      await balances.recordAfter();

      const document = await cryptid.document();
      expectDocumentNotToIncludeService(document, alias);

      // cryptid account paid nothing
      expect(balances.for(doaSigner)).to.equal(0);
      // signer paid fee
      expect(balances.for(key.publicKey)).to.equal(-TRANSACTION_FEE);
    });

    it('should keep any other added content', async () => {
      const key2 = Keypair.generate().publicKey;
      await cryptid.addKey(key2, 'key2')

      await cryptid.removeService(alias);

      const document = await cryptid.document();
      expectDocumentToIncludeKey(document, key2);
    });
  });
});
