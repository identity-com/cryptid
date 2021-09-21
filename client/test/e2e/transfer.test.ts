import { build } from '../../src';
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { publicKeyToDid } from '../../src/lib/util';
import { airdrop } from '../utils/solana';

describe('transfers', function() {
  this.timeout(20_000);
  let connection: Connection;

  let key: Keypair;
  let did: string;

  before(async () => {
    connection = new Connection('http://localhost:8899');
    key = Keypair.generate();
    did = publicKeyToDid(key.publicKey);

    await airdrop(connection, key.publicKey);
  });

  context('a simple cryptid', () => {
    it('should sign a transaction from a DID', async () => {
      const cryptid = await build(did, key, { connection });

      const {
        blockhash: recentBlockhash,
      } = await connection.getRecentBlockhash();
      const tx = new Transaction({ recentBlockhash, feePayer: key.publicKey });
      tx.add(
        SystemProgram.transfer({
          fromPubkey: key.publicKey,
          toPubkey: key.publicKey,
          lamports: 1e3,
        })
      );

      const [cryptidTx] = await cryptid.sign(tx);

      const txSignature = await connection.sendRawTransaction(
        cryptidTx.serialize()
      );

      await connection.confirmTransaction(txSignature);
    });
  });
});
