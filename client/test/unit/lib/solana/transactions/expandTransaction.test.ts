import * as sinon from 'sinon';

import { Keypair, PublicKey } from '@solana/web3.js';
import {
  deriveDefaultDOAFromKey,
  didToPDA,
  publicKeyToDid,
} from '../../../../../src/lib/solana/util';
import { stubGetBlockhash } from '../../../../utils/lang';
import { create } from '../../../../../src/lib/solana/instructions/expandTransaction';
import { range } from 'ramda';
import { randomInt } from 'crypto';
import { AccountOperation } from '../../../../../src/lib/solana/model/AccountOperation';
import { AssignablePublicKey } from '../../../../../src/lib/solana/model/AssignablePublicKey';
import { UnitValue } from '../../../../../src/lib/solana/solanaBorsh';
import { normalizeSigner } from '../../../../../src/lib/util';
import {
  AddAccount,
  AddAccounts,
  AddData,
  InstructionOperation,
} from '../../../../../src/lib/solana/model/InstructionOperation';
import { InstructionData } from '../../../../../src/lib/solana/model/InstructionData';
import { TransactionAccountMeta } from '../../../../../src/lib/solana/model/TransactionAccountMeta';

const sandbox = sinon.createSandbox();

describe('transactions/expandTransaction', function () {
  const payer = Keypair.generate();
  const did = publicKeyToDid(payer.publicKey);
  let didPDAKey: PublicKey;

  beforeEach(() => stubGetBlockhash(sandbox));
  afterEach(sandbox.restore);

  before(async () => {
    didPDAKey = await didToPDA(did);
  });

  it('should create an expand instruction', async () => {
    const accountOperations = range(0, randomInt(2, 10)).map(() => {
      switch (randomInt(0, 3)) {
        case 0:
          return new AccountOperation({
            add: AssignablePublicKey.fromPublicKey(
              Keypair.generate().publicKey
            ),
          });
        case 1:
          return new AccountOperation({
            clear: new UnitValue(),
          });
        case 2:
          return new AccountOperation({
            addMany: range(0, randomInt(2, 10)).map(() =>
              AssignablePublicKey.fromPublicKey(Keypair.generate().publicKey)
            ),
          });
        default:
          throw new Error('Out of bounds');
      }
    });

    const instructionOperations: InstructionOperation[] = range(
      0,
      randomInt(2, 10)
    ).map(() => {
      switch (randomInt(0, 8)) {
        case 0:
          return new InstructionOperation({
            push: new InstructionData({
              accounts: range(0, randomInt(2, 10)).map(() =>
                TransactionAccountMeta.random()
              ),
              data: new Uint8Array(randomInt(1, 1000)),
              program_id: randomInt(0, 10),
            }),
          });
        case 1:
          return new InstructionOperation({
            pop: new UnitValue(),
          });
        case 2:
          return new InstructionOperation({
            addAccount: new AddAccount({
              index: randomInt(0, 10),
              account: TransactionAccountMeta.random(),
            }),
          });
        case 3:
          return new InstructionOperation({
            addAccounts: new AddAccounts({
              index: randomInt(0, 10),
              account: range(0, randomInt(2, 10)).map(() =>
                TransactionAccountMeta.random()
              ),
            }),
          });
        case 4:
          return new InstructionOperation({
            clearAccounts: randomInt(0, 10),
          });
        case 5:
          return new InstructionOperation({
            addData: new AddData({
              index: randomInt(0, 10),
              data: new Buffer(randomInt(1, 1000)),
            }),
          });
        case 6:
          return new InstructionOperation({
            clearData: randomInt(0, 10),
          });
        case 7:
          return new InstructionOperation({
            clear: new UnitValue(),
          });
        default:
          throw new Error('Out of bounds');
      }
    });

    const seed = Math.floor(Math.random() * 100000).toString();
    const instruction1 = await create(
      accountOperations,
      instructionOperations,
      didPDAKey,
      await deriveDefaultDOAFromKey(didPDAKey),
      seed,
      false,
      [normalizeSigner(payer), []]
    );

    console.log(instruction1);

    const instruction2 = await create(
      accountOperations,
      instructionOperations,
      didPDAKey,
      await deriveDefaultDOAFromKey(didPDAKey),
      seed,
      true,
      [normalizeSigner(payer), []]
    );

    console.log(instruction2);
  });
});
