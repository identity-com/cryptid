import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {directExecute} from "../../../../../src/lib/solana/transactions/directExecute";
import {Keypair, Transaction} from "@solana/web3.js";
import {recentBlockhash} from "../../../../utils/solana";
import {publicKeyToDid} from "../../../../../src/lib/solana/util";
import {normalizeSigner} from "../../../../../src/lib/util";
import {stubGetBlockhash} from "../../../../utils/lang";

chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('transactions/directExecute', () => {
  const payer = Keypair.generate();
  const did = publicKeyToDid(payer.publicKey);

  beforeEach(() => stubGetBlockhash(sandbox));
  afterEach(sandbox.restore);

  it('should create and sign a directExecute transaction', async () => {

    const txToWrap = new Transaction( { recentBlockhash: await recentBlockhash() });
    const directExecuteTransaction = await directExecute(txToWrap, did, payer.publicKey, [normalizeSigner(payer)]);
    expect(directExecuteTransaction.signatures).to.have.length(1);
    expect(directExecuteTransaction.signatures[0].publicKey.toString()).to.equal(payer.publicKey.toString())
  })

  it('should sign the directExecute transaction with all passed-in signers', async () => {
    const additionalSigner = Keypair.generate();

    const txToWrap = new Transaction( { recentBlockhash: await recentBlockhash() });
    const directExecuteTransaction = await directExecute(txToWrap, did, payer.publicKey, [normalizeSigner(payer), normalizeSigner(additionalSigner)]);
    expect(directExecuteTransaction.signatures).to.have.length(2);
    expect(directExecuteTransaction.signatures[1].publicKey.toString()).to.equal(additionalSigner.publicKey.toString())
  })
});
