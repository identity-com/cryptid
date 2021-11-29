import * as sinon from 'sinon';

import { Keypair, PublicKey } from '@solana/web3.js';
import {
  deriveDefaultDOAFromKey,
  didToPDA,
  publicKeyToDid,
} from '../../../../../src/lib/solana/util';
import { stubGetBlockhash } from '../../../../utils/lang';
import { create } from '../../../../../src/lib/solana/instructions/proposeTransaction';
import { randomInt } from 'crypto';
import { range } from 'ramda';
import InstructionData from '../../../../../src/lib/solana/model/InstructionData';
import { normalizeSigner } from '../../../../../src/lib/util';
import { expect } from 'chai';
import { CryptidInstruction } from '../../../../../src/lib/solana/instructions/instruction';
import { randomInstructionData } from '../model/InstructionData.test';
import { randomArray } from '../util.test';
import AssignablePublicKey from '../../../../../src/lib/solana/model/AssignablePublicKey';

const sandbox = sinon.createSandbox();

describe('transactions/proposeTransaction', function () {
  const payer = Keypair.generate();
  const did = publicKeyToDid(payer.publicKey);
  let didPDAKey: PublicKey;
  let cryptidAccount: PublicKey;

  beforeEach(() => stubGetBlockhash(sandbox));
  afterEach(sandbox.restore);

  before(async () => {
    didPDAKey = await didToPDA(did);
    cryptidAccount = await deriveDefaultDOAFromKey(didPDAKey);
  });

  it('should create a propose transaction instruction', async () => {
    const accounts: PublicKey[] = range(0, randomInt(2, 10))
      .map(Keypair.generate)
      .map((keypair) => keypair.publicKey);
    const instructions: InstructionData[] = randomArray(
      randomInstructionData,
      2,
      10
    );

    const seed = Math.floor(Math.random() * 100000).toString();
    const readyToExecute = randomInt(0, 2) === 1;
    const instruction = await create(
      accounts,
      instructions,
      didPDAKey,
      'cryptid',
      cryptidAccount,
      seed,
      [[normalizeSigner(payer), []]],
      readyToExecute
    );

    expect(instruction.keys.map((meta) => meta.pubkey.toBase58()))
      .contains(didPDAKey.toBase58())
      .and.contains(cryptidAccount.toBase58())
      .and.contains(payer.publicKey.toBase58());

    const data = CryptidInstruction.decode(
      instruction.data,
      CryptidInstruction
    );
    if (data.proposeTransaction) {
      const propose = data.proposeTransaction;
      expect(propose.instructions).to.deep.equal(instructions);
      expect(propose.accounts).to.deep.equal(
        accounts.map(AssignablePublicKey.fromPublicKey)
      );
      expect(propose.accountSeed).to.equal(seed);
      expect(propose.readyToExecute.value).to.equal(readyToExecute);
    } else {
      throw new Error('Invalid instruction');
    }
  });
});
