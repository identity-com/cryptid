import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {removeController} from "../../../../../../src/lib/solana/transactions/did/removeController";
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
import {DIDDocument} from "did-resolver";

chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;

const sandbox = sinon.createSandbox();

const controller = 'did:sol:controller';

const stubResolveDID = async (did: string, key: Keypair, registered: boolean):Promise<DIDDocument> => {
  const document = await stubResolve(sandbox)(did, key, registered)

  // add the controller that will be removed
  document.controller = [controller]

  return document;
};

describe('transactions/did/removeController', () => {
  const key = Keypair.generate();
  const did = publicKeyToDid(key.publicKey);

  let document: DIDDocument;

  beforeEach(() => stubConnection(sandbox));

  beforeEach(async () => {
    document = await stubResolveDID(did, key, true);
  })

  afterEach(sandbox.restore);

  it('should create an update instruction', async () => {
    const dummyUpdateInstruction = new TransactionInstruction({keys: [], programId: SOL_DID_PROGRAM_ID});
    sandbox.stub(SolDid, 'createUpdateInstruction').resolves(dummyUpdateInstruction);

    const transaction = await removeController(connection(), did, key.publicKey, controller, [normalizeSigner(key)]);

    expect(transaction.instructions).to.have.length(1);
    expect(transaction.instructions[0]).to.equal(dummyUpdateInstruction);
  })

  it('should remove the controller field', async () => {
    const expectedDocument = sinon.match((doc) => doc.controller === undefined)
    const expectation = sandbox.mock(DIDUtil).expects('registerOrUpdate').withArgs(did, expectedDocument)

    await removeController(connection(), did, key.publicKey, controller, [normalizeSigner(key)]);

    expectation.verify();
  })

  it('should retain other controllers in the controller field', async () => {
    const anotherController = 'did:sol:anotherController';
    (document.controller as string[]).push(anotherController)

    const expectedDocument = sinon.match({ controller: [anotherController]})

    const expectation = sandbox.mock(DIDUtil).expects('registerOrUpdate').withArgs(did, expectedDocument)

    await removeController(connection(), did, key.publicKey, controller, [normalizeSigner(key)]);

    expectation.verify();
  })

  it('should remove the controller field as a string', async () => {
    document.controller = controller
    const expectedDocument = sinon.match((doc) => doc.controller === undefined)
    const expectation = sandbox.mock(DIDUtil).expects('registerOrUpdate').withArgs(did, expectedDocument)

    await removeController(connection(), did, key.publicKey, controller, [normalizeSigner(key)]);

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
    document.service = [makeService()]

    const expectedDocument = sinon.match({
      // ensure the keys and service are still there
      ...pick(['verificationMethod', 'assertionMethod', 'authentication', 'capabilityInvocation', 'capabilityDelegation', 'keyAgreement', 'service'], document)
    })
    const expectation = sandbox.mock(DIDUtil).expects('registerOrUpdate').withArgs(did, expectedDocument)

    await removeController(connection(), did, key.publicKey, controller, [normalizeSigner(key)]);

    expectation.verify();
  })

  it('should throw an error if the document controllers array is missing', async () => {
    delete document.controller;

    const shouldFail = removeController(connection(), did, key.publicKey, controller, [normalizeSigner(key)]);

    return expect(shouldFail).to.be.rejectedWith(/not found/)
  })

  it('should throw an error if the controller is not found on the document', async () => {
    document.controller = ['did:sol:someotherdid'];

    const shouldFail = removeController(connection(), did, key.publicKey, controller, [normalizeSigner(key)]);

    return expect(shouldFail).to.be.rejectedWith(/not found/)
  })

  it('should throw an error if the controller field is a string but not the one to be removed', async () => {
    document.controller = 'did:sol:someotherdid';

    const shouldFail = removeController(connection(), did, key.publicKey, controller, [normalizeSigner(key)]);

    return expect(shouldFail).to.be.rejectedWith(/not found/)
  })
});
