// import {largeCancel} from "../../../../../src/lib/solana/transactions/largeCancel";
import {Connection, Keypair, PublicKey} from '@solana/web3.js';
import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import {stubGetBlockhash} from "../../../../utils/lang";
import {largeCancel} from "../../../../../src/lib/solana/transactions/largeCancel";
import {publicKeyToDid} from "../../../../../src/lib/solana/util";
import {didToDefaultDOASigner, normalizeSigner} from "../../../../../src/lib/util";
import {CRYPTID_PROGRAM_ID} from "../../../../../src";

chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
const {expect} = chai;

const sandbox = sinon.createSandbox();

describe('transactions/largeCancel', () => {
  let payer: Keypair;
  let did: string;
  let cryptidAddress: PublicKey;

  before(async () => {
    payer = Keypair.generate();
    did = publicKeyToDid(payer.publicKey);
    cryptidAddress = await didToDefaultDOASigner(did);
  });
  beforeEach(() => stubGetBlockhash(sandbox));
  afterEach(sandbox.restore);

  it('cancels a large transaction', async () => {
    const connection = new Connection('http://localhost:8899');
    const transactionAccount = Keypair.generate().publicKey;
    const tx = await largeCancel(
      connection,
      transactionAccount,
      did,
      payer.publicKey,
      [normalizeSigner(payer)],
      cryptidAddress
    );

    expect(tx.instructions.length).to.equal(1);
    expect(tx.instructions[0].programId.toBase58()).to.equal(CRYPTID_PROGRAM_ID.toBase58());
    expect(tx.instructions[0].data.at(0)).to.equal(4); // check the discriminant
  });
});
