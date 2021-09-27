import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {removeService} from "../../../../../../src/lib/solana/transactions/did/removeService";
import * as DIDUtil from "../../../../../../src/lib/solana/transactions/did/util";
import {connection, stubConnection} from "../../../../../utils/solana";
import {Keypair, TransactionInstruction} from "@solana/web3.js";
import {publicKeyToDid} from "../../../../../../src/lib/solana/util";
import {normalizeSigner} from "../../../../../../src/lib/util";
import * as SolDid from "@identity.com/sol-did-client";
import {
  makeService,
  makeVerificationMethod,
  stubResolveDID as stubResolve
} from "../../../../../utils/did";
import {SOL_DID_PROGRAM_ID} from "../../../../../../src/lib/constants";
import {pick} from "ramda";
import {DIDDocument, ServiceEndpoint} from "did-resolver";

chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;

const sandbox = sinon.createSandbox();

const key = Keypair.generate();
const did = publicKeyToDid(key.publicKey);
const alias = `service1`;
const service: ServiceEndpoint = {
  id: `${did}#${alias}`,
  type: 'some service',
  serviceEndpoint: 'somewhere'
};

const stubResolveDID = async (did: string, key: Keypair, registered: boolean):Promise<DIDDocument> => {
  const document = await stubResolve(sandbox)(did, key, registered)

  // add the service that will be removed
  document.service = [service]

  return document;
};

describe('transactions/did/removeService', () => {
  let document: DIDDocument;

  beforeEach(() => stubConnection(sandbox));

  beforeEach(async () => {
    document = await stubResolveDID(did, key, true);
  })

  afterEach(sandbox.restore);

  it('should create an update instruction', async () => {
    const dummyUpdateInstruction = new TransactionInstruction({keys: [], programId: SOL_DID_PROGRAM_ID});
    sandbox.stub(SolDid, 'createUpdateInstruction').resolves(dummyUpdateInstruction);

    const transaction = await removeService(connection(), did, key.publicKey, alias, [normalizeSigner(key)]);

    expect(transaction.instructions).to.have.length(1);
    expect(transaction.instructions[0]).to.equal(dummyUpdateInstruction);
  })

  it('should remove the service field', async () => {
    const expectedDocument = sinon.match((doc) => doc.service === undefined)
    const expectation = sandbox.mock(DIDUtil).expects('registerOrUpdate').withArgs(did, expectedDocument)

    await removeService(connection(), did, key.publicKey, alias, [normalizeSigner(key)]);

    expectation.verify();
  })

  it('should retain other services in the service field', async () => {
    const anotherService = makeService();
    (document.service as ServiceEndpoint[]).push(anotherService)

    const expectedDocument = sinon.match({ service: [anotherService]})

    const expectation = sandbox.mock(DIDUtil).expects('registerOrUpdate').withArgs(did, expectedDocument)

    await removeService(connection(), did, key.publicKey, alias, [normalizeSigner(key)]);

    expectation.verify();
  })

  it('should retain all other data', async () => {
    // add a load of random keys
    document.verificationMethod = [
      {
        id: `${did}#default`,
        type: 'Ed25519VerificationKey2018',
        controller: did,
        publicKeyBase58: key.publicKey.toBase58(),
      },
      makeVerificationMethod()
    ];
    document.assertionMethod = [makeVerificationMethod()];
    document.authentication = [makeVerificationMethod()];
    document.capabilityInvocation = [makeVerificationMethod()];
    document.capabilityDelegation = [makeVerificationMethod()];
    document.keyAgreement = [makeVerificationMethod()];
    document.controller = ['did:sol:some-controller']

    const expectedDocument = sinon.match({
      // ensure the keys and controllers are still there
      ...pick(['verificationMethod', 'assertionMethod', 'authentication', 'capabilityInvocation', 'capabilityDelegation', 'keyAgreement', 'controller'], document)
    })
    const expectation = sandbox.mock(DIDUtil).expects('registerOrUpdate').withArgs(did, expectedDocument)

    await removeService(connection(), did, key.publicKey, alias, [normalizeSigner(key)]);

    expectation.verify();
  })

  it('should throw an error if the document services array is missing', async () => {
    delete document.service;

    const shouldFail = removeService(connection(), did, key.publicKey, alias, [normalizeSigner(key)]);

    return expect(shouldFail).to.be.rejectedWith(/not found/)
  })

  it('should throw an error if the service is not found on the document', async () => {
    document.service = [makeService()];

    const shouldFail = removeService(connection(), did, key.publicKey, alias, [normalizeSigner(key)]);

    return expect(shouldFail).to.be.rejectedWith(/not found/)
  })
});
