import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {addKey} from "../../../../../../src/lib/solana/transactions/did/addKey";
import {connection, dummyDIDAccountInfo, pubkey} from "../../../../../utils/solana";
import {Connection, Keypair, TransactionInstruction} from "@solana/web3.js";
import {publicKeyToDid} from "../../../../../../src/lib/solana/util";
import {normalizeSigner} from "../../../../../../src/lib/util";
import * as SolDid from "@identity.com/sol-did-client";
import {didDocument} from "../../../../../utils/did";
import {DecentralizedIdentifier} from "@identity.com/sol-did-client";
import {SOL_DID_PROGRAM_ID} from "../../../../../../src/lib/constants";

chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;

const sandbox = sinon.createSandbox();

// stub a registered DID i.e. a DID that has an account (pdaAddress) on-chain or a non-registered one.
// note - dummyDIDAccountInfo should officially contain a serialized SolData object, but atm
// it just contains an empty data buffer. This is primarily because sol-did does not expose SolData.
const stubResolveDID = async (did: string, key: Keypair, registered: boolean) => {
  const decentralizedIdentifier = DecentralizedIdentifier.parse(did);
  const pdaAddress = await decentralizedIdentifier.pdaSolanaPubkey()
  sandbox.stub(SolDid, 'resolve').withArgs(did).resolves(didDocument(key.publicKey))

  // we need both for this test (stub SolDid and Connection) as the code resolves the doc
  // and checks if the DID is registered as separate operations. This could be optimised later.
  sandbox.stub(Connection.prototype, 'getAccountInfo')
    .withArgs(pdaAddress)
    .resolves(registered ? dummyDIDAccountInfo : null)
};

describe('transactions/did/addKey', () => {
  const key = Keypair.generate();
  const newKey = Keypair.generate();
  const did = publicKeyToDid(key.publicKey);

  beforeEach(() => {
    sandbox.stub(Connection.prototype, 'sendRawTransaction').resolves('txSig')
    // stub getRecentBlockhash to return a valid blockhash from mainnet, to avoid going to the blockchain
    sandbox.stub(Connection.prototype, 'getRecentBlockhash').resolves({
      blockhash: 'FFPCDfh4NE3rfq1xTeJiZ5dAECNftv1p8vYinDBUn8dw',
      feeCalculator: { lamportsPerSignature: 0 }
    })
  });

  afterEach(sandbox.restore);

  it('should create an update instruction if the DID is registered', async () => {
    await stubResolveDID(did, key, true);
    const dummyUpdateInstruction = new TransactionInstruction({keys: [], programId: SOL_DID_PROGRAM_ID});
    sandbox.stub(SolDid, 'createUpdateInstruction').resolves(dummyUpdateInstruction);

    const transaction = await addKey(connection(), did, key.publicKey, newKey.publicKey, 'newKey', [normalizeSigner(key)]);

    expect(transaction.instructions).to.have.length(1);
    expect(transaction.instructions[0]).to.equal(dummyUpdateInstruction);
  })

  it('should create a register instruction if the DID is not yet registered', async () => {
    await stubResolveDID(did, key, false);
    const dummyRegisterInstruction = new TransactionInstruction({keys: [], programId: SOL_DID_PROGRAM_ID});
    sandbox.stub(SolDid, 'createRegisterInstruction').resolves([dummyRegisterInstruction, pubkey()]);

    const transaction = await addKey(connection(), did, key.publicKey, newKey.publicKey, 'newKey', [normalizeSigner(key)]);

    expect(transaction.instructions).to.have.length(1);
    expect(transaction.instructions[0]).to.equal(dummyRegisterInstruction);
  })
});
