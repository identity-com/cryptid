import chai from 'chai';

import { build, Cryptid } from '../../src';

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

import {
  airdrop,
  Balances,
  createTransferTransaction,
  sendAndConfirmCryptidTransaction,
} from '../utils/solana';

import { publicKeyToDid } from '../../src/lib/solana/util';

const { expect } = chai;
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

// needs to be less than AIRDROP_LAMPORTS
const lamportsToTransfer = LAMPORTS_PER_SOL * 0.01;

const FEE = 0;

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
      airdrop(connection, cryptidAddress, LAMPORTS_PER_SOL), // the main funds for the cryptid account
      airdrop(connection, key.publicKey, LAMPORTS_PER_SOL), // to cover fees only
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

    it('should be able to execute 60 transfer instructions without cryptid', async () => {
      const tx = await createTransferTransaction(
        connection,
        key.publicKey,
        recipient,
        lamportsToTransfer,
        60
      );
      await sendAndConfirmTransaction(connection, tx, [key]);
      await balances.recordAfter();
      expect(balances.for(key.publicKey)).to.equal(
        -(60 * lamportsToTransfer + FEE)
      ); // fees only
      expect(balances.for(recipient)).to.equal(60 * lamportsToTransfer); // fees only
    });

    it('should be able to setup and execute a large tx', async () => {
      console.log(`cryptid address: ${cryptidAddress.toBase58()}`);
      console.log(`signer key: ${key.publicKey.toBase58()}`);
      console.log(`recipient: ${recipient.toBase58()}`);

      const cryptid = build(did, key, { connection });

      // TODO: (IDCOM-1953) Increase the number of instructions
      const nrInstructions = 10;
      const tx = await createTransferTransaction(
        connection,
        cryptidAddress,
        recipient,
        lamportsToTransfer,
        nrInstructions
      );
      const { setupTransactions, executeTransaction } = await cryptid.signLarge(
        tx
      );

      // setupTransactions
      for (const setupTransaction of setupTransactions) {
        await sendAndConfirmCryptidTransaction(connection, setupTransaction);
      }
      // execution
      await sendAndConfirmCryptidTransaction(connection, executeTransaction);
      await balances.recordAfter();

      // assert balances are correct
      expect(balances.for(cryptidAddress)).to.equal(
        -nrInstructions * lamportsToTransfer
      ); // the amount transferred
      expect(balances.for(key.publicKey)).to.equal(
        -FEE * (setupTransactions.length + 1)
      ); // fees only
      // expect(balances.for(recipient)).to.equal(nrInstructions * lamportsToTransfer); // the amount received
      // TODO: Why does this fail with "AssertionError: expected 457561 to equal 460000" Where do the lamports go?
    });
  });
});
