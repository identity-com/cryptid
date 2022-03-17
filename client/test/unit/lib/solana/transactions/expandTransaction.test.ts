import * as sinon from 'sinon';

import { Keypair, PublicKey } from '@solana/web3.js';
import {
  deriveDefaultCryptidAccountFromKey,
  didToPDA,
  publicKeyToDid,
} from '../../../../../src/lib/solana/util';
import { stubGetBlockhash } from '../../../../utils/lang';
import { create } from '../../../../../src/lib/solana/instructions/expandTransaction';
import AccountOperation from '../../../../../src/lib/solana/model/AccountOperation';
import { normalizeSigner } from '../../../../../src/lib/util';
import InstructionOperation from '../../../../../src/lib/solana/model/InstructionOperation';
import { expect } from 'chai';
import { CryptidInstruction } from '../../../../../src/lib/solana/instructions/instruction';
import { randomAccountOperation } from '../model/AccountOperation.test';
import { randomInstructionOperation } from '../model/InstructionOperation.test';
import { randomArray } from '../util.test';

const sandbox = sinon.createSandbox();

describe('instruction/expandTransaction', function () {
  const payer = Keypair.generate();
  const did = publicKeyToDid(payer.publicKey);
  let didPDAKey: PublicKey;
  let cryptidAccount: PublicKey;
  const seed = Math.floor(Math.random() * 100000).toString();

  beforeEach(() => stubGetBlockhash(sandbox));
  afterEach(sandbox.restore);

  before(async () => {
    didPDAKey = await didToPDA(did);
    cryptidAccount = await deriveDefaultCryptidAccountFromKey(didPDAKey);
  });

  context('with account and instruction operations', () => {
    const accountOperations: AccountOperation[] = randomArray(
      randomAccountOperation,
      2,
      10
    );

    const instructionOperations: InstructionOperation[] = randomArray(
      randomInstructionOperation,
      2,
      10
    );

    it('should create an expand instruction not ready', async () => {
      const instruction = await create(
        accountOperations,
        instructionOperations,
        didPDAKey,
        cryptidAccount,
        seed,
        false,
        [normalizeSigner(payer), []]
      );

      expect(instruction.keys.map((key) => key.pubkey.toBase58()))
        .contains(cryptidAccount.toBase58())
        .and.contains(didPDAKey.toBase58())
        .and.contains(payer.publicKey.toBase58());

      const data = CryptidInstruction.decode(
        instruction.data,
        CryptidInstruction
      );
      if (data.expandTransaction) {
        const expand = data.expandTransaction;
        expect(expand.accountOperations).to.deep.equal(accountOperations);
        expect(expand.instructionOperations).to.deep.equal(
          instructionOperations
        );
        expect(expand.readyToExecute.value).to.equal(false);
      } else {
        throw new Error('Instruction was not expand');
      }
    });

    it('should create an expand instruction ready', async () => {
      const instruction = await create(
        accountOperations,
        instructionOperations,
        didPDAKey,
        cryptidAccount,
        seed,
        true,
        [normalizeSigner(payer), []]
      );

      expect(instruction.keys.map((key) => key.pubkey.toBase58()))
        .contains(cryptidAccount.toBase58())
        .and.contains(didPDAKey.toBase58())
        .and.contains(payer.publicKey.toBase58());

      const data = CryptidInstruction.decode(
        instruction.data,
        CryptidInstruction
      );
      if (data.expandTransaction) {
        const expand = data.expandTransaction;
        expect(expand.accountOperations).to.deep.equal(accountOperations);
        expect(expand.instructionOperations).to.deep.equal(
          instructionOperations
        );
        expect(expand.readyToExecute.value).to.equal(true);
      } else {
        throw new Error('Instruction was not expand');
      }
    });
  });
});
