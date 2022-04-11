import { build, Cryptid } from '../../src';
import {
  airdrop,
  Balances,
  createTransferTransaction,
  sendAndConfirmCryptidTransaction,
} from '../utils/solana';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from '@solana/web3.js';
import { publicKeyToDid } from '../../src/lib/solana/util';

import chai from 'chai';
const { expect } = chai;

const lamportsToTransfer = 20_000;
const FEE = 5_000;

describe('large cancel', function () {
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
      airdrop(connection, cryptidAddress, 5 * LAMPORTS_PER_SOL), // the main funds for the cryptid account
      airdrop(connection, key.publicKey, 5 * LAMPORTS_PER_SOL), // to cover fees only
    ]);
  });

  beforeEach(async () => {
    balances = await new Balances(connection).register(
      cryptidAddress,
      key.publicKey,
    );
  });

  it('should be able to setup and cancel a large tx', async () => {
    console.log(`cryptid address: ${cryptidAddress.toBase58()}`);
    console.log(`signer key: ${key.publicKey.toBase58()}`);
    console.log(`recipient: ${recipient.toBase58()}`);

    const expectedRent = 70490880;

    const cryptid = build(did, key, { connection });

    const nrInstructions = 23;
    const tx = await createTransferTransaction(
      connection,
      cryptidAddress,
      recipient,
      lamportsToTransfer,
      nrInstructions
    );

    const { setupTransactions } = await cryptid.signLarge(tx);

    // setupTransactions
    for (const setupTransaction of setupTransactions) {
      await sendAndConfirmCryptidTransaction(connection, setupTransaction);
    }

    const pending = await cryptid.listPendingTx();
    expect(pending.length).to.equal(1);

    const aiBefore = await connection.getAccountInfo(pending[0]);
    expect(aiBefore).to.not.be.null;

    await balances.recordAfter();
    expect(balances.for(key.publicKey)).to.equal(-FEE);
    expect(balances.for(cryptidAddress)).to.equal(-expectedRent);

    const signature = await cryptid.cancelLarge(pending[0]);
    await connection.confirmTransaction(signature, 'confirmed');

    await balances.recordAfter();
    expect(balances.for(key.publicKey)).to.equal(2 * -FEE);
    expect(balances.for(cryptidAddress)).to.equal(0); // rent recovered

    // There should be no pending transaction accounts
    const pendingCancelled = await cryptid.listPendingTx();
    expect(pendingCancelled.length).to.equal(0);

    // Transaction account lookup to not return
    const aiAfter = await connection.getAccountInfo(pending[0]);
    expect(aiAfter).to.be.null;
  });
});
