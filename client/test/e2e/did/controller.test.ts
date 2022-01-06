import { build, Cryptid } from '../../../src';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { airdrop, Balances } from '../../utils/solana';
import { publicKeyToDid } from '../../../src/lib/solana/util';
import chai from 'chai';
import {
  expectDocumentNotToIncludeController,
  expectDocumentToIncludeKey,
  expectDocumentToIncludeController,
} from '../../utils/did';

const { expect } = chai;

const TRANSACTION_FEE = 5000;

const controller =
  'did:sol:localnet:' + Keypair.generate().publicKey.toBase58();

describe('DID Controller operations', function () {
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
        key.publicKey
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

      it('should add a controller', async () => {
        await cryptid.addController(controller);

        await balances.recordAfter();

        const document = await cryptid.document();
        expectDocumentToIncludeController(document, controller);
        expect(document.controller).to.have.lengthOf(1);

        // check the key was not overwritten
        expectDocumentToIncludeKey(document, addedKey);

        console.log(document);

        // cryptid account paid nothing
        expect(balances.for(doaSigner)).to.equal(0);
        // signer paid fee
        expect(balances.for(key.publicKey)).to.equal(-TRANSACTION_FEE);
      });

      it('should add a second controller', async () => {
        const secondController =
          'did:sol:localnet:' + Keypair.generate().publicKey.toBase58();

        await cryptid.addController(controller);
        await cryptid.addController(secondController);

        const document = await cryptid.document();
        expectDocumentToIncludeController(document, controller);
        expectDocumentToIncludeController(document, secondController);

        console.log(document);

        expect(document.controller).to.have.lengthOf(2);
      });
    });
  });

  context('removeController', () => {
    beforeEach(async () => {
      // add a controller to upgrade (anchor) the did
      await cryptid.addController(controller);

      balances = await new Balances(connection).register(
        doaSigner,
        key.publicKey
      );
    });

    it('should remove the added controller', async () => {
      await cryptid.removeController(controller);

      await balances.recordAfter();

      const document = await cryptid.document();
      expectDocumentNotToIncludeController(document, controller);
      expect(document.verificationMethod).to.have.lengthOf(1) // default key

      // cryptid account paid nothing
      expect(balances.for(doaSigner)).to.equal(0);
      // signer paid fee
      expect(balances.for(key.publicKey)).to.equal(-TRANSACTION_FEE);
    });

    it('should keep any other added content', async () => {
      const key2 = Keypair.generate().publicKey;
      await cryptid.addKey(key2, 'key2');

      await cryptid.removeController(controller);

      const document = await cryptid.document();
      expectDocumentToIncludeKey(document, key2);

      // TODO this is a bug in sol-did. The default key is being duplicated
      expect(document.verificationMethod).to.have.lengthOf(2) // default and key2
    });
  });

  context('removeController with existing key', () => {
    const key_A = Keypair.generate().publicKey
    const controller_A =
      'did:sol:localnet:' + key_A.toBase58()

    beforeEach(async () => {
      // add a controller to upgrade (anchor) the did
      await cryptid.addKey(key_A, 'keyA')
      await cryptid.addController(controller_A);
    });

    it('should remove the added controller and add it again', async () => {
      await cryptid.removeController(controller_A);

      const document = await cryptid.document();

      expectDocumentNotToIncludeController(document, controller_A);
      expect(document.verificationMethod).to.have.lengthOf(2) // default key + keyA

      // add controller again
      await cryptid.addController(controller_A);
    });
  });

  it('update DID Document as controller', async () => {
    // setup controlled
    const controlledKey = Keypair.generate();
    const controlledDid =
      'did:sol:localnet:' + controlledKey.publicKey.toBase58();
    const controlledCryptid = await build(controlledDid, controlledKey, {
      connection,
      waitForConfirmation: true,
    });

    // setup controller
    const controllerKey = Keypair.generate();
    const controllerDid =
      'did:sol:localnet:' + controllerKey.publicKey.toBase58();
    const controllerCryptid = await build(controllerDid, controllerKey, {
      connection,
      waitForConfirmation: true,
    });

    // money money money
    await airdrop(connection, controlledKey.publicKey);
    await airdrop(connection, controllerKey.publicKey);
    await airdrop(connection, await controlledCryptid.address());
    await airdrop(connection, await controllerCryptid.address());

    // Add controller to controlled
    await controlledCryptid.addController(controllerDid);

    // shows the lack of control
    const inControlCryptid = controllerCryptid.as(controlledDid);
    await inControlCryptid.addKey(Keypair.generate().publicKey, 'allyourbase');
  });
});
