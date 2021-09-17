import { build } from '../../src';
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { publicKeyToDid } from '../../src/lib/util';

describe('transfers', () => {
  let connection: Connection;

  let key: Keypair;
  let did: string;

  before(() => {
    connection = new Connection('http://localhost:8899');
    key = Keypair.generate();
    did = publicKeyToDid(key.publicKey);
  });

  context('a simple cryptid', () => {
    it('should sign a transaction from a DID', async () => {
      const cryptid = await build(did, key, { connection });

      const { blockhash: recentBlockhash } =
        await connection.getRecentBlockhash();
      const tx = new Transaction({ recentBlockhash });
      tx.add(
        SystemProgram.transfer({
          fromPubkey: key.publicKey,
          toPubkey: key.publicKey,
          lamports: 1e3,
        })
      );

      const cryptidTx = await cryptid.sign(tx);

      const txSignature = await connection.sendTransaction(cryptidTx[0], []);

      await connection.confirmTransaction(txSignature);
    });
  });
});
