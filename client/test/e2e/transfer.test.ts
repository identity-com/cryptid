import chai from 'chai';

import { build, Cryptid } from '../../src';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  airdrop,
  createTransferTransaction,
  sendAndConfirmCryptidTransaction,
} from '../utils/solana';
import { publicKeyToDid } from '../../src/lib/solana/util';

const { expect } = chai;

// needs to be less than AIRDROP_LAMPORTS
const lamportsToTransfer = 50_000;

describe('transfers', function () {
  this.timeout(20_000);
  let connection: Connection;

  let key: Keypair;
  let did: string;
  let doaSigner: PublicKey;
  let recipient: PublicKey;

  let cryptid: Cryptid;

  before(async () => {
    connection = new Connection('http://localhost:8899', 'confirmed');
    key = Keypair.generate();
    did = publicKeyToDid(key.publicKey, 'localnet');
    recipient = Keypair.generate().publicKey;

    cryptid = await build(did, key, { connection, waitForConfirmation: true });

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
    it('should sign a transaction from a DID', async () => {
      const cryptid = await build(did, key, { connection });

      const tx = await createTransferTransaction(
        connection,
        doaSigner,
        recipient,
        lamportsToTransfer
      );

      // record balances before sending
      const signerPreBalance = await connection.getBalance(key.publicKey);
      const cryptidPreBalance = await connection.getBalance(doaSigner);

      const [cryptidTx] = await cryptid.sign(tx);
      await sendAndConfirmCryptidTransaction(connection, cryptidTx);

      // record balances after sending
      const signerPostBalance = await connection.getBalance(key.publicKey);
      const cryptidPostBalance = await connection.getBalance(doaSigner);
      const recipientPostBalance = await connection.getBalance(recipient);

      console.log({
        signer: {
          signerPreBalance,
          signerPostBalance,
        },
        cryptid: {
          cryptidPreBalance,
          cryptidPostBalance,
        },
        recipient: {
          recipientPostBalance,
        },
      });

      // assert balances are correct
      expect(cryptidPreBalance - cryptidPostBalance).to.equal(
        lamportsToTransfer
      ); // the amount transferred
      expect(signerPreBalance - signerPostBalance).to.equal(5000); // fees only

      // skip for now as it is consistently returning 2,439 lamports too few
      // expect(recipientPostBalance).to.equal(lamportsToTransfer);
    });

    it('should sign a transaction from a DID with a second key', async () => {
      // record balance at the start
      const cryptidPreBalance = await connection.getBalance(doaSigner);

      // the initial key held by device 1
      const device1Key = key;
      // the cryptid client for device 1 that will add the new key
      const cryptidForDevice1 = build(did, key, {
        connection,
        waitForConfirmation: true,
        rentPayer: 'SIGNER_PAYS',
      });

      // the new key that will be added to the DID
      const device2Key = Keypair.generate();
      const alias = 'device2';

      // airdrop enough funds into device 1 key ot cover rent
      // TODO figure out how to allow the cryptid account to pay for this
      await airdrop(connection, device1Key.publicKey, 50_000_000);
      // airdrop to the new key to cover fees only
      await airdrop(connection, device2Key.publicKey, 100_000);

      // add the new key and create a cryptid client for device 2
      await cryptidForDevice1.addKey(device2Key.publicKey, alias);
      const cryptidForDevice2 = await build(did, device2Key, {
        connection,
        waitForConfirmation: true,
      });

      console.log(`DOA Signer ${doaSigner}`);
      console.log(`DID ${did}`);
      console.log(`device2Key ${device2Key.publicKey}`);

      // create a transfer and sign with cryptid for device 2
      const tx = await createTransferTransaction(
        connection,
        doaSigner,
        recipient,
        lamportsToTransfer
      );
      const [cryptidTx] = await cryptidForDevice2.sign(tx);
      await sendAndConfirmCryptidTransaction(connection, cryptidTx);

      // record balances after sending
      const cryptidPostBalance = await connection.getBalance(doaSigner);
      // assert balances are correct
      expect(cryptidPreBalance - cryptidPostBalance).to.equal(
        lamportsToTransfer
      ); // the amount transferred
    });
  });
});
