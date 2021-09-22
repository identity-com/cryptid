import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import chaiThings from 'chai-things';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import * as Util from '../../../../../src/lib/solana/transactions/util';
import {Connection, Keypair, SystemProgram} from "@solana/web3.js";
import {pubkey} from "../../../../utils/solana";
import {normalizeSigner} from "../../../../../src/lib/util";
import {complement, isNil, pluck, toString} from "ramda";
import {publicKeyToDid} from "../../../../../src/lib/solana/util";

chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
chai.use(chaiThings);
const { expect, should } = chai;

should();

const sandbox = sinon.createSandbox();

const connection = () => new Connection('http://whatever.test')
const notNil = complement(isNil)

describe('transactions/util', () => {
  beforeEach(() => {
    sandbox.stub(Connection.prototype, 'sendRawTransaction').resolves('txSig')
    // stub getRecentBlockhash to return a valid blockhash from mainnet, to avoid going to the blockchain
    sandbox.stub(Connection.prototype, 'getRecentBlockhash').resolves({
      blockhash: 'FFPCDfh4NE3rfq1xTeJiZ5dAECNftv1p8vYinDBUn8dw',
      feeCalculator: { lamportsPerSignature: 0 }
    })
  });

  context('createAndSignTransaction', () => {
    it('should sign the transaction with all passed-in signers', async () => {
      const feePayer = Keypair.generate();
      const sender = Keypair.generate();
      const signers = [feePayer, sender].map(normalizeSigner)

      const instruction = SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: pubkey(),
        lamports: 0,
      })

      const transaction = await Util.createAndSignTransaction(connection(), [instruction], feePayer.publicKey, signers);

      expect(transaction.signatures).to.have.length(2);
      // map to strings to compare public keys without worrying about internal structure (chai .members does not support .equals())
      expect(pluck('publicKey', transaction.signatures).map(toString)).to.have.members([feePayer.publicKey, sender.publicKey].map(toString))

      // chai-things requires "should"
      pluck('signature', transaction.signatures).should.all.satisfy(notNil)
    })
  })

  // in progress
  context.skip('registerInstructionIfNeeded', () => {
    it('should return null if the DID is registered', async () => {
      const sender = Keypair.generate();

      const instruction = await Util.registerInstructionIfNeeded(
        connection(),
        publicKeyToDid(sender.publicKey),
        normalizeSigner(sender),
      );

      console.log(instruction);
    })
  })
});
