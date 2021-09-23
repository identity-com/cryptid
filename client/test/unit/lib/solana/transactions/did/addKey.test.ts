import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import chaiThings from 'chai-things';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {addKey} from "../../../../../../src/lib/solana/transactions/did/addKey";

chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
chai.use(chaiThings);
const { expect, should } = chai;

// chai-things requires "should"
should();

const sandbox = sinon.createSandbox();

describe('transactions/did/addKey', () => {
  beforeEach(() => {
    sandbox.stub(Connection.prototype, 'sendRawTransaction').resolves('txSig')
    // stub getRecentBlockhash to return a valid blockhash from mainnet, to avoid going to the blockchain
    sandbox.stub(Connection.prototype, 'getRecentBlockhash').resolves({
      blockhash: 'FFPCDfh4NE3rfq1xTeJiZ5dAECNftv1p8vYinDBUn8dw',
      feeCalculator: { lamportsPerSignature: 0 }
    })
  });

  afterEach(sandbox.restore);

    it('should create an update instruction if the DID is registered', async () => {
      await addKey(connection())

      const feePayer = Keypair.generate();
      const sender = Keypair.generate();
      const signers = [feePayer, sender].map(normalizeSigner)

      const instruction = SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: pubkey(),
        lamports: 0,
      })

      const transaction = await Util.createTransaction(connection(), [instruction], feePayer.publicKey, signers);

      expect(transaction.signatures).to.have.length(2);
      // map to strings to compare public keys without worrying about internal structure (chai .members does not support .equals())
      expect(pluck('publicKey', transaction.signatures).map(toString)).to.have.members([feePayer.publicKey, sender.publicKey].map(toString))

      // chai-things requires "should"
      pluck('signature', transaction.signatures).should.all.satisfy(notNil)
    })
});
