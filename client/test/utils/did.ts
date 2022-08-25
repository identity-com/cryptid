import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { publicKeyToDid } from '../../src/lib/solana/util';
import { DIDDocument, ServiceEndpoint, VerificationMethod } from 'did-resolver';
import { DIDComponent } from '../../src/lib/solana/transactions/did/util';
import chai from 'chai';
import { pluck } from 'ramda';
import { randomUUID } from 'crypto';
import { DidSolIdentifier } from '@identity.com/sol-did-client';
// import * as SolDid from '@identity.com/sol-did-client';
import { dummyDIDAccountInfo } from './solana';
import * as Sinon from 'sinon';
import Assertion = Chai.Assertion;

const { expect } = chai;

export const makeKeypair = (): Keypair => Keypair.generate();
export const did = (keypair: Keypair = makeKeypair()): string =>
  publicKeyToDid(keypair.publicKey);

export const didDocument = (key: PublicKey): DIDDocument => ({
  id: 'did:sol:' + key.toString(),
});

export const makeVerificationMethod = (): VerificationMethod => ({
  id: randomUUID(),
  type: randomUUID(),
  controller: randomUUID(),
  publicKeyBase58: Keypair.generate().publicKey.toBase58(),
});

export const makeService = (): ServiceEndpoint => ({
  id: randomUUID(),
  type: randomUUID(),
  serviceEndpoint: randomUUID(),
});

const keysInDocument = (document: DIDDocument): (string | undefined)[] =>
  pluck('publicKeyBase58', document.verificationMethod || []);

export const expectDocumentToIncludeKey = (
  document: DIDDocument,
  key: PublicKey
): Assertion => expect(keysInDocument(document)).to.include(key.toString());

export const expectDocumentNotToIncludeKey = (
  document: DIDDocument,
  newKey: PublicKey
): Assertion => {
  return expect(keysInDocument(document)).not.to.include(newKey.toString());
};

export const serviceAlias = (component: DIDComponent): string =>
  component.id.substring(component.id.indexOf('#') + 1);
const servicesInDocument = (document: DIDDocument): string[] =>
  (document.service || []).map(serviceAlias);

export const expectDocumentToIncludeService = (
  document: DIDDocument,
  service: string
): Assertion => expect(servicesInDocument(document)).to.include(service);

export const expectDocumentNotToIncludeService = (
  document: DIDDocument,
  service: string
): Assertion => {
  return expect(servicesInDocument(document)).not.to.include(service);
};

export const expectDocumentToIncludeController = (
  document: DIDDocument,
  controller: string
): Assertion => expect(document.controller || []).to.include(controller);

export const expectDocumentNotToIncludeController = (
  document: DIDDocument,
  controller: string
): Assertion => expect(document.controller || []).not.to.include(controller);

// stub a registered DID i.e. a DID that has an account (pdaAddress) on-chain or a non-registered one.
// note - dummyDIDAccountInfo should officially contain a serialized SolData object, but atm
// it just contains an empty data buffer. This is primarily because sol-did does not expose SolData.
export const stubResolveDID =
  (sandbox: Sinon.SinonSandbox) =>
  async (
    did: string,
    key: Keypair,
    registered: boolean
  ): Promise<DIDDocument> => {
    const decentralizedIdentifier = DidSolIdentifier.parse(did);
    const [pdaAddress] = await decentralizedIdentifier.dataAccount();
    const document = didDocument(key.publicKey);
    // TODO: Reenable stub
    // sandbox.stub(SolDid, 'resolve').withArgs(did).resolves(document);

    // we need both for this test (stub SolDid and Connection) as the code resolves the doc
    // and checks if the DID is registered as separate operations. This could be optimised later.
    sandbox
      .stub(Connection.prototype, 'getAccountInfo')
      .withArgs(pdaAddress)
      .resolves(registered ? dummyDIDAccountInfo : null);

    return document;
  };
