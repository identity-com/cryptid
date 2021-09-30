import { build, Cryptid } from '../../../src';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { airdrop, Balances } from '../../utils/solana';
import { publicKeyToDid } from '../../../src/lib/solana/util';
import chai from 'chai';
import {
  expectDocumentNotToIncludeController,
  expectDocumentToIncludeKey,
  expectDocumentToIncludeController
} from "../../utils/did";

const { expect } = chai;

const TRANSACTION_FEE = 5000;

const controller = 'did:sol:123'

// unskip when the program supports controllers
describe.skip('DID Controller operations', function () {
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

  context('addController', () => {
    beforeEach(async () => {
      balances = await new Balances(connection).register(
        doaSigner,
        key.publicKey,
      );
    });

    context('with a generative DID', () => {
      const [expectedFee, expectedRent] = [5000, 11330880];

      it('should register the DID and add a controller', async () => {
        await cryptid.addController(controller);

        await balances.recordAfter();

        const document = await cryptid.document();
        expectDocumentToIncludeController(document, controller);

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

      it('should add a new controller', async () => {
        await cryptid.addController(controller);

        await balances.recordAfter();

        const document = await cryptid.document();
        expectDocumentToIncludeController(document, controller);

        // check the key was not overwritten
        expectDocumentToIncludeKey(document, addedKey);

        // cryptid account paid nothing
        expect(balances.for(doaSigner)).to.equal(0);
        // signer paid fee
        expect(balances.for(key.publicKey)).to.equal(-TRANSACTION_FEE);
      });
    });
  });

  context('removeController', () => {
    beforeEach(async () => {
      // add a controller to upgrade (anchor) the did
      await cryptid.addController(controller);

      balances = await new Balances(connection).register(
        doaSigner,
        key.publicKey,
      );
    });

    it('should remove the added controller', async () => {
      await cryptid.removeController(controller);

      await balances.recordAfter();

      const document = await cryptid.document();
      expectDocumentNotToIncludeController(document, controller);

      // cryptid account paid nothing
      expect(balances.for(doaSigner)).to.equal(0);
      // signer paid fee
      expect(balances.for(key.publicKey)).to.equal(-TRANSACTION_FEE);
    });

    it('should keep any other added content', async () => {
      const key2 = Keypair.generate().publicKey;
      await cryptid.addKey(key2, 'key2')

      await cryptid.removeController(controller);

      const document = await cryptid.document();
      expectDocumentToIncludeKey(document, key2);
    });
  });
});