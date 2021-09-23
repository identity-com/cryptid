import { build } from '../../src';
import { Connection, Keypair } from '@solana/web3.js';
import { airdrop } from '../utils/solana';
import { publicKeyToDid } from '../../src/lib/solana/util';
import chai from 'chai';

const { expect } = chai;

describe('DID operations', function () {
  this.timeout(20_000);
  let connection: Connection;

  let key: Keypair;
  let did: string;

  before(async () => {
    connection = new Connection('http://localhost:8899');
    key = Keypair.generate();
    did = publicKeyToDid(key.publicKey, 'localnet');

    await airdrop(connection, key.publicKey);
  });

  context('with a generative DID', () => {
    context('update', () => {
      it('should register the DID and add a key', async () => {
        const cryptid = await build(did, key, {
          connection,
          waitForConfirmation: true,
        });

        const newKey = Keypair.generate().publicKey;
        const alias = 'key2';

        await cryptid.addKey(newKey, alias);

        const document = await cryptid.document();
        expect(
          document.verificationMethod?.map(
            (verificationMethod) => verificationMethod.publicKeyBase58
          )
        ).to.include(newKey.toString());
      });
    });
  });
});
