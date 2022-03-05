import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { removeController } from '../../../../../../src/lib/solana/transactions/did/removeController';
import { connection, stubConnection } from '../../../../../utils/solana';
import { Keypair, TransactionInstruction } from '@solana/web3.js';
import { publicKeyToDid } from '../../../../../../src/lib/solana/util';
import { normalizeSigner } from '../../../../../../src/lib/util';
import * as SolDid from '@identity.com/sol-did-client';
import { SOL_DID_PROGRAM_ID } from '../../../../../../src/lib/constants';

chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;

const sandbox = sinon.createSandbox();

const controller = 'did:sol:controller';

describe('transactions/did/removeController', () => {
  const key = Keypair.generate();
  const did = publicKeyToDid(key.publicKey);

  beforeEach(() => stubConnection(sandbox));

  afterEach(sandbox.restore);

  it('should create an update instruction', async () => {
    const dummyUpdateInstruction = new TransactionInstruction({
      keys: [],
      programId: SOL_DID_PROGRAM_ID,
    });
    sandbox
      .stub(SolDid, 'createRemoveControllerInstruction')
      .resolves(dummyUpdateInstruction);

    const transaction = await removeController(
      connection(),
      did,
      normalizeSigner(key),
      controller,
      key.publicKey
    );

    expect(transaction.instructions).to.have.length(1);
    expect(transaction.instructions[0]).to.equal(dummyUpdateInstruction);
  });
});
