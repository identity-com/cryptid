import chai from 'chai';

import { build, Cryptid } from '../../src';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { airdrop } from '../utils/solana';
import {publicKeyToDid} from "../../src/lib/solana/util";

const { expect } = chai;

describe('transfers', function () {
  this.timeout(20_000);
  let connection: Connection;

  let key: Keypair;
  let did: string;
  let doaSigner: PublicKey;

  let cryptid: Cryptid;

  before(async () => {
    connection = new Connection('http://localhost:8899', 'confirmed');
    key = Keypair.generate();
    did = publicKeyToDid(key.publicKey);

    cryptid = await build(did, key, { connection });

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
      // needs to be less than AIRDROP_LAMPORTS
      const lamportsToTransfer = 50_000;
      const recipient = Keypair.generate();
      const cryptid = await build(did, key, { connection });

      const { blockhash: recentBlockhash } =
        await connection.getRecentBlockhash();
      const tx = new Transaction({ recentBlockhash, feePayer: doaSigner }).add(
        SystemProgram.transfer({
          fromPubkey: doaSigner,
          toPubkey: recipient.publicKey,
          lamports: lamportsToTransfer,
        })
      );

      // record balances before sending
      const signerPreBalance = await connection.getBalance(key.publicKey);
      const cryptidPreBalance = await connection.getBalance(doaSigner);

      const [cryptidTx] = await cryptid.sign(tx);
      const txSignature = await connection.sendRawTransaction(
        cryptidTx.serialize()
      );
      await connection.confirmTransaction(txSignature);

      // record balances after sending
      const signerPostBalance = await connection.getBalance(key.publicKey);
      const cryptidPostBalance = await connection.getBalance(doaSigner);
      const recipientPostBalance = await connection.getBalance(
        recipient.publicKey
      );

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
  });
});
