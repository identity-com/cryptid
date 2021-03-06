import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import chaiThings from 'chai-things';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import * as Util from '../../../../../src/lib/solana/transactions/util';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import {
  pubkey,
  dummyDIDAccountInfo,
  connection,
  recentBlockhash,
} from '../../../../utils/solana';
import { normalizeSigner } from '../../../../../src/lib/util';
import { complement, isNil, pluck, toString } from 'ramda';
import { publicKeyToDid } from '../../../../../src/lib/solana/util';
import { SOL_DID_PROGRAM_ID } from '../../../../../src/lib/constants';
import { DecentralizedIdentifier } from '@identity.com/sol-did-client';

chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
chai.use(chaiThings);
const { expect, should } = chai;

// chai-things requires "should"
should();

const sandbox = sinon.createSandbox();

const notNil = complement(isNil);

describe('transactions/util', () => {
  beforeEach(() => {
    sandbox.stub(Connection.prototype, 'sendRawTransaction').resolves('txSig');
    // stub getRecentBlockhash to return a valid blockhash from mainnet, to avoid going to the blockchain
    sandbox.stub(Connection.prototype, 'getRecentBlockhash').resolves({
      blockhash: 'FFPCDfh4NE3rfq1xTeJiZ5dAECNftv1p8vYinDBUn8dw',
      feeCalculator: { lamportsPerSignature: 0 },
    });
  });

  afterEach(sandbox.restore);

  context('createAndSignTransaction', () => {
    it('should sign the transaction with all passed-in signers', async () => {
      const feePayer = Keypair.generate();
      const sender = Keypair.generate();
      const signers = [feePayer, sender].map(normalizeSigner);

      const instruction = SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: pubkey(),
        lamports: 0,
      });

      const transaction = await Util.createTransaction(
        await recentBlockhash(),
        [instruction],
        feePayer.publicKey,
        signers
      );

      expect(transaction.signatures).to.have.length(2);
      // map to strings to compare public keys without worrying about internal structure (chai .members does not support .equals())
      expect(
        pluck('publicKey', transaction.signatures).map(toString)
      ).to.have.members([feePayer.publicKey, sender.publicKey].map(toString));

      // chai-things requires "should"
      pluck('signature', transaction.signatures).should.all.satisfy(notNil);
    });
  });

  context('registerInstructionIfNeeded', () => {
    const sender = Keypair.generate();
    const did = publicKeyToDid(sender.publicKey);

    it('should return null if the DID is registered', async () => {
      const pdaAddress = await DecentralizedIdentifier.parse(
        did
      ).pdaSolanaPubkey();
      sandbox
        .stub(Connection.prototype, 'getAccountInfo')
        .withArgs(pdaAddress)
        .resolves(dummyDIDAccountInfo);

      const instruction = await Util.registerInstructionIfNeeded(
        connection(),
        did,
        sender.publicKey
      );

      expect(instruction).to.be.null;
    });

    it('should return an instruction if the DID is not registered', async () => {
      const pdaAddress = await DecentralizedIdentifier.parse(
        did
      ).pdaSolanaPubkey();
      sandbox
        .stub(Connection.prototype, 'getAccountInfo')
        .withArgs(pdaAddress)
        .resolves(null);

      const instruction = await Util.registerInstructionIfNeeded(
        connection(),
        did,
        sender.publicKey,
        {},
        10_000_000
      );

      expect(instruction!.programId.toString()).to.equal(
        SOL_DID_PROGRAM_ID.toString()
      );
    });

    it('should throw an error if the derived address is registered to another program', async () => {
      const pdaAddress = await DecentralizedIdentifier.parse(
        did
      ).pdaSolanaPubkey();
      sandbox
        .stub(Connection.prototype, 'getAccountInfo')
        .withArgs(pdaAddress)
        .resolves({
          ...dummyDIDAccountInfo,
          owner: pubkey(),
        });

      const shouldFail = Util.registerInstructionIfNeeded(
        connection(),
        did,
        sender.publicKey
      );

      return expect(shouldFail).to.be.rejectedWith(
        /registered to another program/
      );
    });
  });

  context('AccountFilter and InstructionFilters', () => {
    it('should filter out public keys and accounts in a unique way', () => {

      const sender = Keypair.generate();
      const receipient1 = Keypair.generate();
      const receipient2 = Keypair.generate();

      const instruction1 = SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: receipient1.publicKey,
        lamports: 0,
      });
      const instruction2 = SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: receipient2.publicKey,
        lamports: 0,
      });

      const uniqAccounts = Util.collectAccounts([instruction1, instruction2])
      expect(uniqAccounts).to.deep.equal([instruction1.programId, sender.publicKey, receipient1.publicKey, receipient2.publicKey])
    });

    it('should return the right index on non-reference PublicKeys', () => {

      const key1 = Keypair.generate();
      const key2 = Keypair.generate();
      const key3 = Keypair.generate();

      expect(Util.findAccountIndex(
        new PublicKey(key1.publicKey.toBase58()),
        [key1.publicKey, key2.publicKey, key3.publicKey]
        )).to.equal(0)
      expect(Util.findAccountIndex(
        new PublicKey(key3.publicKey.toBuffer()),
        [key1.publicKey, key2.publicKey, key3.publicKey]
      )).to.equal(2)
      expect(Util.findAccountIndex(
        new PublicKey(key2.publicKey.toBytes()),
        [key1.publicKey, key2.publicKey, key2.publicKey]
      )).to.equal(1)
    });

    it('should filter and reduce AccountMeta correctly', () => {
      const key_sign1 = Keypair.generate();
      const key_sign2 = Keypair.generate();
      const key3 = Keypair.generate();

      const instruction1 = SystemProgram.transfer({
        fromPubkey: key_sign1.publicKey,
        toPubkey: key_sign2.publicKey,
        lamports: 0,
      });
      const instruction2 = SystemProgram.transfer({
        fromPubkey: key_sign2.publicKey,
        toPubkey: key3.publicKey,
        lamports: 0,
      });

      const uniqAccounts = Util.collectAccountMetas([instruction1, instruction2])
      expect(uniqAccounts).to.deep.equal([{
        pubkey: instruction1.programId,
        isSigner: false,
        isWritable: false,
      }, {
        pubkey: key_sign1.publicKey,
        isSigner: true,
        isWritable: true,
      }, {
        pubkey: key_sign2.publicKey,
        isSigner: true,
        isWritable: true,
      }, {
        pubkey: key3.publicKey,
        isSigner: false,
        isWritable: true,
      }]);
    });
  });
});
