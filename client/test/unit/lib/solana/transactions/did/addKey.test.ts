import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {addKey} from "../../../../../../src/lib/solana/transactions/did/addKey";
import {connection} from "../../../../../utils/solana";
import {Connection, Keypair} from "@solana/web3.js";
import {publicKeyToDid} from "../../../../../../src/lib/solana/util";
import {normalizeSigner} from "../../../../../../src/lib/util";
import * as SolDid from "@identity.com/sol-did-client";
import {didDocument} from "../../../../../utils/did";

chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
// const { expect } = chai;

const sandbox = sinon.createSandbox();

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
    // const decentralizedIdentifier = DecentralizedIdentifier.parse(did);
    // const pdaAddress = await decentralizedIdentifier.pdaSolanaPubkey()
    sandbox.stub(SolDid, 'resolve').withArgs(did).resolves(didDocument(key.publicKey))
    // sandbox.stub(Connection.prototype, 'getAccountInfo')
    //   .withArgs(pdaAddress)
    //   .resolves({
    //     ...dummyDIDAccountInfo,
    //     data: SolData.sparse(
    //       pdaAddress,
    //       key.publicKey,
    //       decentralizedIdentifier.clusterType
    //     ).encode()
    //   })

    await addKey(connection(), did, key.publicKey, newKey.publicKey, 'newKey', [normalizeSigner(key)]);
  })
});
