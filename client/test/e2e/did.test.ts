import { build, Cryptid } from '../../src';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { airdrop } from '../utils/solana';
import { publicKeyToDid } from '../../src/lib/solana/util';
import chai from 'chai';

const { expect } = chai;

describe('DID operations', function () {
  this.timeout(60_000);
  let connection: Connection;

  let key: Keypair;
  let did: string;
  let doaSigner: PublicKey;
  let cryptid: Cryptid;

  before(async () => {
    connection = new Connection('http://localhost:8899', 'confirmed');
    key = Keypair.generate();
    did = publicKeyToDid(key.publicKey, 'localnet');
    cryptid = await build(did, key, {
      connection,
      waitForConfirmation: true,
    });
    doaSigner = await cryptid.address();

    await Promise.all([
      airdrop(connection, doaSigner), // the main funds for the cryptid account
      airdrop(connection, key.publicKey, 100_000), // to cover fees only
    ]);
  });

  context('with a generative DID', () => {
    context('update', () => {
      it('should register the DID and add a key', async () => {
        const newKey = Keypair.generate().publicKey;
        const alias = 'key2';

        const [expectedFee, expectedRent] = [5000, 11325880];

        const cryptidPreBalance = await connection.getBalance(doaSigner);
        await cryptid.addKey(newKey, alias);
        const cryptidPostBalance = await connection.getBalance(doaSigner);

        const document = await cryptid.document();
        expect(
          document.verificationMethod?.map(
            (verificationMethod) => verificationMethod.publicKeyBase58
          )
        ).to.include(newKey.toString());

        console.log({ cryptidPreBalance, cryptidPostBalance });
        expect(cryptidPreBalance - cryptidPostBalance).to.equal(
          expectedFee + expectedRent
        );
      });
    });
  });
});
