import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { removeKey } from '../../../../../../src/lib/solana/transactions/did/removeKey';
import { connection, stubConnection } from '../../../../../utils/solana';
import { Keypair, TransactionInstruction } from '@solana/web3.js';
import { publicKeyToDid } from '../../../../../../src/lib/solana/util';
import { normalizeSigner } from '../../../../../../src/lib/util';
import * as SolDid from '@identity.com/sol-did-client';
import { stubResolveDID as stubResolve } from '../../../../../utils/did';
import { SOL_DID_PROGRAM_ID } from '../../../../../../src/lib/constants';
import { DIDDocument } from 'did-resolver';

chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;

const sandbox = sinon.createSandbox();

const alias = 'newKey';

const stubResolveDID = async (
  did: string,
  key: Keypair,
  registered: boolean
): Promise<DIDDocument> => {
  const document = await stubResolve(sandbox)(did, key, registered);

  // add the key that will be removed
  document.verificationMethod = [
    {
      id: did + '#' + alias,
      controller: did,
      type: '...',
    },
  ];

  return document;
};

describe('transactions/did/removeKey', () => {
  const key = Keypair.generate();
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
      .stub(SolDid, 'createRemoveKeyInstruction')
      .resolves(dummyUpdateInstruction);

    const transaction = await removeKey(
      connection(),
      did,
      normalizeSigner(key),
      alias,
      key.publicKey
    );

    expect(transaction.instructions).to.have.length(1);
    expect(transaction.instructions[0]).to.equal(dummyUpdateInstruction);
  });
});
