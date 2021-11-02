import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { removeKey } from '../../../../../../src/lib/solana/transactions/did/removeKey';
import * as DIDUtil from '../../../../../../src/lib/solana/transactions/did/util';
import {
  connection,
  pubkey,
  stubConnection,
} from '../../../../../utils/solana';
import { Keypair, TransactionInstruction } from '@solana/web3.js';
import { publicKeyToDid } from '../../../../../../src/lib/solana/util';
import { normalizeSigner } from '../../../../../../src/lib/util';
import * as SolDid from '@identity.com/sol-did-client';
import {
  makeService,
  makeVerificationMethod,
  stubResolveDID as stubResolve,
} from '../../../../../utils/did';
import { SOL_DID_PROGRAM_ID } from '../../../../../../src/lib/constants';
import { pick } from 'ramda';
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
      .stub(SolDid, 'createUpdateInstruction')
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

  it('should create a register instruction if the DID is not yet registered', async () => {
    await stubResolveDID(did, key, false);
    const dummyRegisterInstruction = new TransactionInstruction({
      keys: [],
      programId: SOL_DID_PROGRAM_ID,
    });
    sandbox
      .stub(SolDid, 'createRegisterInstruction')
      .resolves([dummyRegisterInstruction, pubkey()]);

    const transaction = await removeKey(
      connection(),
      did,
      normalizeSigner(key),
      alias,
      key.publicKey
    );

    expect(transaction.instructions).to.have.length(1);
    expect(transaction.instructions[0]).to.equal(dummyRegisterInstruction);
  });

  it('should retain all other data', async () => {
    // add a load of random keys
    const document = await stubResolveDID(did, key, false);
    if (!document.verificationMethod) {
      document.verificationMethod = [];
    }
    document.verificationMethod.push(
      {
        id: `${did}#default`,
        type: 'Ed25519VerificationKey2018',
        controller: did,
        publicKeyBase58: key.publicKey.toBase58(),
      },
      makeVerificationMethod()
    );
    document.assertionMethod = [makeVerificationMethod()];
    document.authentication = [makeVerificationMethod()];
    document.capabilityInvocation = [makeVerificationMethod()];
    document.capabilityDelegation = [makeVerificationMethod()];
    document.keyAgreement = [makeVerificationMethod()];
    document.service = [makeService()];

    const expectedDocument = sinon.match({
      // ensure the keys are still there
      ...pick(
        [
          'assertionMethod',
          'authentication',
          'capabilityInvocation',
          'capabilityDelegation',
          'keyAgreement',
          'service',
        ],
        document
      ),
    });
    const expectation = sandbox
      .mock(DIDUtil)
      .expects('registerOrUpdate')
      .withArgs(did, expectedDocument);

    await removeKey(
      connection(),
      did,
      normalizeSigner(key),
      alias,
      key.publicKey
    );

    expectation.verify();
  });

  it('should remove the key from all verificationMethods', async () => {
    // add the new key to all the verificationMethods
    const document = await stubResolveDID(did, key, false);
    document.assertionMethod = [`${did}#${alias}`];
    document.authentication = [`${did}#${alias}`];
    document.capabilityInvocation = [`${did}#${alias}`];
    document.capabilityDelegation = [`${did}#${alias}`];
    document.keyAgreement = [`${did}#${alias}`];

    // ensure they are cleared
    const expectedDocument = sinon.match({
      assertionMethod: [],
      authentication: [],
      capabilityInvocation: [],
      capabilityDelegation: [],
      keyAgreement: [],
    });
    const expectation = sandbox
      .mock(DIDUtil)
      .expects('registerOrUpdate')
      .withArgs(did, expectedDocument);

    await removeKey(
      connection(),
      did,
      normalizeSigner(key),
      alias,
      key.publicKey
    );

    expectation.verify();
  });

  it('should throw an error if the document verification methods array is missing', async () => {
    const document = await stubResolveDID(did, key, true);
    delete document.verificationMethod;

    const shouldFail = removeKey(
      connection(),
      did,
      normalizeSigner(key),
      alias,
      key.publicKey
    );

    return expect(shouldFail).to.be.rejectedWith(/not found/);
  });

  it('should throw an error if the key is not found on the document', async () => {
    const document = await stubResolveDID(did, key, true);
    if (!document.verificationMethod) {
      document.verificationMethod = [];
    }
    document.verificationMethod[0].id = did + '#somethingelse';

    const shouldFail = removeKey(
      connection(),
      did,
      normalizeSigner(key),
      alias,
      key.publicKey
    );

    return expect(shouldFail).to.be.rejectedWith(/not found/);
  });
});
