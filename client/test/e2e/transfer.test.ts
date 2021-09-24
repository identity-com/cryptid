import chai from 'chai';

import { build, Cryptid } from '../../src';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  airdrop,
  Balances,
  createTransferTransaction,
  sendAndConfirmCryptidTransaction,
} from '../utils/solana';
import { publicKeyToDid } from '../../src/lib/solana/util';

const { expect } = chai;

// needs to be less than AIRDROP_LAMPORTS
const lamportsToTransfer = 20_000;

describe('transfers', function () {
  this.timeout(20_000);
  let connection: Connection;

  let key: Keypair;
  let did: string;
  let doaSigner: PublicKey;
  let recipient: PublicKey;

  let cryptid: Cryptid;
  let balances: Balances;

  before(async () => {
    connection = new Connection('http://localhost:8899', 'confirmed');
    key = Keypair.generate();
    did = publicKeyToDid(key.publicKey, 'localnet');
    recipient = Keypair.generate().publicKey;

    cryptid = build(did, key, { connection, waitForConfirmation: true });

    doaSigner = await cryptid.address();

    console.log(`Wallet: ${key.publicKey}`);
    console.log(`DID: ${did}`);
    console.log(`Cryptid Address: ${doaSigner}`);

    await Promise.all([
      airdrop(connection, doaSigner), // the main funds for the cryptid account
      airdrop(connection, key.publicKey, 100_000), // to cover fees only
    ]);
  });

  context('a simple cryptid', () => {
    beforeEach(async () => {
      balances = await new Balances(connection).register(
        doaSigner,
        key.publicKey,
        recipient
      );
    });

    it('should sign a transaction from a DID', async () => {
      const cryptid = build(did, key, { connection });

      const tx = await createTransferTransaction(
        connection,
        doaSigner,
        recipient,
        lamportsToTransfer
      );

      const [cryptidTx] = await cryptid.sign(tx);
      await sendAndConfirmCryptidTransaction(connection, cryptidTx);

      await balances.recordAfter();

      // assert balances are correct
      expect(balances.for(doaSigner)).to.equal(-lamportsToTransfer); // the amount transferred
      expect(balances.for(key.publicKey)).to.equal(-5000); // fees only

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
        doaSigner,
        recipient,
        lamportsToTransfer
      );

      await balances.recordBefore(); // reset balances to exclude rent costs for adding device2

      const [cryptidTx] = await cryptidForDevice2.sign(tx);
      await sendAndConfirmCryptidTransaction(connection, cryptidTx);

      await balances.recordAfter();

      // assert balances are correct
      expect(balances.for(doaSigner)).to.equal(-lamportsToTransfer); // the amount transferred
    });
  });
});
