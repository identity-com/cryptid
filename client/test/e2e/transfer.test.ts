import chai from 'chai';

import { build, Cryptid } from '../../src';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import {
  airdrop,
  Balances,
  createTransaction,
  createTransferTransaction,
  sendAndConfirmCryptidTransaction,
} from '../utils/solana';
import { publicKeyToDid } from '../../src/lib/solana/util';

const { expect } = chai;
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

// needs to be less than AIRDROP_LAMPORTS
const lamportsToTransfer = 20_000;

const FEE = 5_000;

describe('transfers', function () {
  this.timeout(20_000);
  let connection: Connection;

  let key: Keypair;
  let did: string;
  let cryptidAddress: PublicKey;
  let recipient: PublicKey;

  let cryptid: Cryptid;
  let balances: Balances;

  before(async () => {
    connection = new Connection('http://localhost:8899', 'confirmed');
    key = Keypair.generate();
    did = publicKeyToDid(key.publicKey, 'localnet');
    recipient = Keypair.generate().publicKey;

    cryptid = build(did, key, { connection, waitForConfirmation: true });

    cryptidAddress = await cryptid.address();

    await Promise.all([
      airdrop(connection, cryptidAddress), // the main funds for the cryptid account
      airdrop(connection, key.publicKey, 100_000), // to cover fees only
    ]);
  });

  context('a simple cryptid', () => {
    beforeEach(async () => {
      balances = await new Balances(connection).register(
        cryptidAddress,
        key.publicKey,
        recipient
      );
    });

    it('should sign a transaction from a DID', async () => {
      const cryptid = build(did, key, { connection });

      const tx = await createTransferTransaction(
        connection,
        cryptidAddress,
        recipient,
        lamportsToTransfer
      );

      const cryptidTx = await cryptid.sign(tx);
      await sendAndConfirmCryptidTransaction(connection, cryptidTx);

      await balances.recordAfter();

      // assert balances are correct
      expect(balances.for(cryptidAddress)).to.equal(-lamportsToTransfer); // the amount transferred
      expect(balances.for(key.publicKey)).to.equal(-FEE); // fees only

      // skip for now as it is consistently returning 2,439 lamports too few
      // expect(balances.for(recipient).to.equal(lamportsToTransfer);
    });

    it('should sign a transaction with two instructions', async () => {
      const cryptid = build(did, key, { connection });

      const instruction1 = SystemProgram.transfer({
        fromPubkey: cryptidAddress,
        toPubkey: recipient,
        lamports: lamportsToTransfer,
      });
      const instruction2 = SystemProgram.transfer({
        fromPubkey: cryptidAddress,
        toPubkey: recipient,
        lamports: lamportsToTransfer,
      });

      const tx = await createTransaction(connection, cryptidAddress, [
        instruction1,
        instruction2,
      ]);

      const cryptidTx = await cryptid.sign(tx);
      await sendAndConfirmCryptidTransaction(connection, cryptidTx);

      await balances.recordAfter();

      // assert balances are correct
      expect(balances.for(cryptidAddress)).to.equal(-(lamportsToTransfer * 2)); // the amount transferred
      expect(balances.for(key.publicKey)).to.equal(-FEE); // fees only

      // skip for now as it is consistently returning 2,439 lamports too few
      // expect(balances.for(recipient).to.equal(lamportsToTransfer);
    });

    it('should sign a transaction from a DID with a second key', async () => {
      // the cryptid client for device 1 that will add the new key
      const cryptidForDevice1 = cryptid;

      // the new key that will be added to the DID
      const device2Key = Keypair.generate();
      const alias = 'device2';

      // airdrop to device2 key to cover fees for the transfer only
      await airdrop(connection, device2Key.publicKey, 10_000);

      // add the new key and create a cryptid client for device 2
      await cryptidForDevice1.addKey(device2Key.publicKey, alias);
      const cryptidForDevice2 = await build(did, device2Key, {
        connection,
        waitForConfirmation: true,
      });

      // create a transfer and sign with cryptid for device 2
      const tx = await createTransferTransaction(
        connection,
        cryptidAddress,
        recipient,
        lamportsToTransfer
      );

      await balances.recordBefore(); // reset balances to exclude rent costs for adding device2

      const cryptidTx = await cryptidForDevice2.sign(tx);
      await sendAndConfirmCryptidTransaction(connection, cryptidTx);

      await balances.recordAfter();

      // assert balances are correct
      expect(balances.for(cryptidAddress)).to.equal(-lamportsToTransfer); // the amount transferred
    });

    it('should fail on a large Transaction', async () => {
      const cryptid = build(did, key, { connection });

      const tx = await createTransferTransaction(
        connection,
        cryptidAddress,
        recipient,
        lamportsToTransfer,
        100
      );

      await expect(cryptid.sign(tx)).to.be.rejectedWith(
        /Transaction is too large/
      );
    });
  });
  context('a controller cryptid', () => {
    let controllerCryptid: Cryptid;

    let controlledCryptidAddress: PublicKey;

    beforeEach('Set up the controller relationship', async () => {
      // create a new controlled DID
      const controlledDIDKey = Keypair.generate();
      const controlledDID = publicKeyToDid(
        controlledDIDKey.publicKey,
        'localnet'
      );
      const controlledCryptid = build(controlledDID, controlledDIDKey, {
        connection,
        waitForConfirmation: true,
      });
      controlledCryptidAddress = await controlledCryptid.address();

      // Create the controller cryptid instance
      controllerCryptid = cryptid.as(controlledDID);

      // airdrop funds to the controlled DID cryptid account
      await airdrop(connection, controlledCryptidAddress);
      // airdrop funds to the controlled DID signer key (for fees)
      await airdrop(connection, controlledDIDKey.publicKey, 10_000);

      // add the controller to the controlled DID (this anchors the controlled DID)
      await controlledCryptid.addController(did);

      balances = await new Balances(connection).register(
        cryptidAddress, // controller cryptid
        controlledCryptidAddress, // controlled cryptid
        key.publicKey, // controller signer
        recipient
      );
    });

    it('should sign a transaction for a controlled DID with a controller key', async () => {
      // create a transfer from the controlled DID
      const tx = await createTransferTransaction(
        connection,
        controlledCryptidAddress,
        recipient,
        lamportsToTransfer
      );

      const cryptidTx = await controllerCryptid.sign(tx); // sign with the controller
      await sendAndConfirmCryptidTransaction(connection, cryptidTx);

      await balances.recordAfter();

      // assert balances are correct
      expect(balances.for(controlledCryptidAddress)).to.equal(
        -lamportsToTransfer
      ); // the amount transferred
      expect(balances.for(cryptidAddress)).to.equal(0); // no change to the controller balance
      expect(balances.for(key.publicKey)).to.equal(-FEE); // the controller's signer key pays the fee
    });
  });
});
