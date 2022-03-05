import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { addService } from '../../../../../../src/lib/solana/transactions/did/addService';
import { connection, stubConnection } from '../../../../../utils/solana';
import { Keypair, TransactionInstruction } from '@solana/web3.js';
import { publicKeyToDid } from '../../../../../../src/lib/solana/util';
import { normalizeSigner } from '../../../../../../src/lib/util';
import * as SolDid from '@identity.com/sol-did-client';
import { stubResolveDID as stubResolve } from '../../../../../utils/did';
import { SOL_DID_PROGRAM_ID } from '../../../../../../src/lib/constants';
import { ServiceEndpoint } from 'did-resolver';
chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;

const sandbox = sinon.createSandbox();

const stubResolveDID = stubResolve(sandbox);

describe('transactions/did/addService', () => {
  const key = Keypair.generate();
  const did = publicKeyToDid(key.publicKey);
  const service: ServiceEndpoint = {
    id: `${did}#service1`,
    type: 'some service',
    serviceEndpoint: 'somewhere',
  };

  beforeEach(() => stubConnection(sandbox));

  afterEach(sandbox.restore);

  it('should create an update instruction if the DID is registered', async () => {
    await stubResolveDID(did, key, true);
    const dummyUpdateInstruction = new TransactionInstruction({
      keys: [],
      programId: SOL_DID_PROGRAM_ID,
    });
    sandbox
      .stub(SolDid, 'createAddServiceInstruction')
      .resolves(dummyUpdateInstruction);

    const transaction = await addService(
      connection(),
      did,
      normalizeSigner(key),
      service,
      key.publicKey
    );

    expect(transaction.instructions).to.have.length(1);
    expect(transaction.instructions[0]).to.equal(dummyUpdateInstruction);
  });
});
