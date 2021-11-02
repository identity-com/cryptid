import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { addKey } from '../../../../../../src/lib/solana/transactions/did/addKey';
import {
  connection,
  pubkey,
  stubConnection,
} from '../../../../../utils/solana';
import { Keypair, TransactionInstruction } from '@solana/web3.js';
import { publicKeyToDid } from '../../../../../../src/lib/solana/util';
import { normalizeSigner } from '../../../../../../src/lib/util';
import * as SolDid from '@identity.com/sol-did-client';
import { stubResolveDID as stubResolve } from '../../../../../utils/did';
import { SOL_DID_PROGRAM_ID } from '../../../../../../src/lib/constants';

chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;

const sandbox = sinon.createSandbox();

const stubResolveDID = stubResolve(sandbox);

describe('transactions/did/addKey', () => {
  const key = Keypair.generate();
  const newKey = Keypair.generate();
  const did = publicKeyToDid(key.publicKey);

  beforeEach(() => stubConnection(sandbox));

  afterEach(sandbox.restore);

  it('should create an update instruction if the DID is registered', async () => {
    await stubResolveDID(did, key, true);
    const dummyUpdateInstruction = new TransactionInstruction({
      keys: [],
      programId: SOL_DID_PROGRAM_ID,
    });
    sandbox
      .stub(SolDid, 'createUpdateInstruction')
      .resolves(dummyUpdateInstruction);

    const transaction = await addKey(
      connection(),
      did,
      normalizeSigner(key),
      newKey.publicKey,
      'newKey',
      key.publicKey
    );

    expect(transaction.instructions).to.have.length(1);
    expect(transaction.instructions[0]).to.equal(dummyUpdateInstruction);
  });

  it('should create a register instruction if the DID is not yet registered', async () => {
    await stubResolveDID(did, key, false);
    const dummyRegisterInstruction = new TransactionInstruction({
      keys: [],
      programId: SOL_DID_PROGRAM_ID,
    });
    sandbox
      .stub(SolDid, 'createRegisterInstruction')
      .resolves([dummyRegisterInstruction, pubkey()]);

    const transaction = await addKey(
      connection(),
      did,
      normalizeSigner(key),
      newKey.publicKey,
      'newKey',
      key.publicKey
    );

    expect(transaction.instructions).to.have.length(1);
    expect(transaction.instructions[0]).to.equal(dummyRegisterInstruction);
  });
});
