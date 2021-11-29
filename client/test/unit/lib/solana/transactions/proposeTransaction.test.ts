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
import { InstructionData } from '../../../../../src/lib/solana/model/InstructionData';
import { TransactionAccountMeta } from '../../../../../src/lib/solana/model/TransactionAccountMeta';
import { normalizeSigner } from '../../../../../src/lib/util';

const sandbox = sinon.createSandbox();

describe('transactions/proposeTransaction', function () {
  const payer = Keypair.generate();
  const did = publicKeyToDid(payer.publicKey);
  let didPDAKey: PublicKey;

  beforeEach(() => stubGetBlockhash(sandbox));
  afterEach(sandbox.restore);

  before(async () => {
    didPDAKey = await didToPDA(did);
  });

  it('should create a propose transaction instruction', async () => {
    const accounts: PublicKey[] = range(0, randomInt(2, 10))
      .map(Keypair.generate)
      .map((keypair) => keypair.publicKey);
    const instructions: InstructionData[] = range(0, randomInt(2, 10)).map(
      () =>
        new InstructionData({
          program_id: randomInt(0, accounts.length),
          accounts: range(0, randomInt(2, 10)).map(() =>
            TransactionAccountMeta.fromIndexAndMeta(
              randomInt(0, accounts.length),
              randomInt(0, 2) === 1,
              randomInt(0, 2) === 1
            )
          ),
          data: new Uint8Array(
            range(0, randomInt(2, 1000)).map(() => randomInt(0, 256))
          ),
        })
    );

    const seed = Math.floor(Math.random() * 100000).toString();
    const instruction = await create(
      accounts,
      instructions,
      didPDAKey,
      'cryptid',
      await deriveDefaultDOAFromKey(didPDAKey),
      seed,
      [[normalizeSigner(payer), []]]
    );

    console.log(instruction);
  });
});
