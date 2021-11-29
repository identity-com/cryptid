import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { didToPDA, publicKeyToDid } from '../../../../../src/lib/solana/util';
import { stubGetBlockhash } from '../../../../utils/lang';
import { create } from '../../../../../src/lib/solana/instructions/executeTransaction';
import {
  deriveDefaultDOAFromKey,
  deriveDOASigner,
  deriveTransactionAccount,
} from '../../../../../src/lib/solana/util';
import { normalizeSigner } from '../../../../../src/lib/util';
import { range } from 'ramda';
import { randomInt } from 'crypto';
import {
  DOA_PROGRAM_ID,
  SOL_DID_PROGRAM_ID,
} from '../../../../../src/lib/constants';
import TransactionAccount from '../../../../../src/lib/solana/accounts/TransactionAccount';
import AssignablePublicKey from '../../../../../src/lib/solana/model/AssignablePublicKey';
import { TransactionAccountSigner } from '../../../../../src/lib/solana/accounts/TransactionAccount';
import { AssignableI64 } from '../../../../../src/lib/solana/solanaBorsh';
import SigningKeyData from '../../../../../src/lib/solana/model/SigningKeyData';
import TransactionState from '../../../../../src/lib/solana/model/TransactionState';
import InstructionData from '../../../../../src/lib/solana/model/InstructionData';
import Discriminant from '../../../../../src/lib/solana/accounts/Discriminant';
import { randomTransactionAccountMeta } from '../model/TransactionAccountMeta.test';
import { AssignableBuffer } from '../../../../../src/lib/solana/solanaBorsh';

chai.use(chaiSubset);
chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;

const sandbox = sinon.createSandbox();

type ByteKeyMeta = {
  pubkey: Uint8Array;
  isSigner: boolean;
  isWritable: boolean;
};

describe('transactions/executeTransaction', function () {
  const payer = Keypair.generate();
  const did = publicKeyToDid(payer.publicKey);
  let didPDAKey: PublicKey;
  let cryptidAccount: PublicKey;
  let crpytidSigner: PublicKey;

  beforeEach(() => stubGetBlockhash(sandbox));
  afterEach(sandbox.restore);

  before(async () => {
    didPDAKey = await didToPDA(did);
    cryptidAccount = await deriveDefaultDOAFromKey(didPDAKey);
    crpytidSigner = await deriveDOASigner(cryptidAccount).then((val) => val[0]);
  });

  it('should create an execute transaction instruction with set accounts', async function () {
    const seed = Math.floor(Math.random() * 100000).toString();
    const accounts = range(0, randomInt(2, 10)).map(() => ({
      pubkey: Keypair.generate().publicKey,
      isWritable: randomInt(0, 2) === 1,
      isSigner: randomInt(0, 2) === 1,
    }));
    accounts.push({
      pubkey: crpytidSigner,
      isSigner: true,
      isWritable: randomInt(0, 2) === 1,
    });

    const instruction = await create(
      didPDAKey,
      cryptidAccount,
      seed,
      [normalizeSigner(payer), []],
      accounts
    );

    expect(instruction.keys.length).to.equal(6 + accounts.length);

    const byteKeys: ByteKeyMeta[] = instruction.keys.map((meta) => ({
      ...meta,
      pubkey: meta.pubkey.toBytes(),
    }));
    const transactionAccount = await deriveTransactionAccount(
      cryptidAccount,
      seed
    );
    const expectedAccounts: ByteKeyMeta[] = [
      {
        pubkey: transactionAccount.toBytes(),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: cryptidAccount.toBytes(), isSigner: false, isWritable: false },
      { pubkey: didPDAKey.toBytes(), isSigner: false, isWritable: false },
      {
        pubkey: SOL_DID_PROGRAM_ID.toBytes(),
        isSigner: false,
        isWritable: false,
      },
      { pubkey: payer.publicKey.toBytes(), isSigner: true, isWritable: false },
      { pubkey: crpytidSigner.toBytes(), isSigner: false, isWritable: true },
      ...accounts.map((meta) => ({
        ...meta,
        pubkey: meta.pubkey.toBytes(),
      })),
    ];
    expect(byteKeys).to.deep.equal(expectedAccounts);

    expect(instruction.data.length).to.equal(1 + 1);
    expect(instruction.data.readUInt8(0)).to.equal(3); // Discriminant
    expect(instruction.data.readUInt8(1)).to.equal(0); // Data
  });

  context('using connection generated accounts', function () {
    const accounts = range(0, randomInt(2, 10)).map(() =>
      AssignablePublicKey.fromPublicKey(Keypair.generate().publicKey)
    );
    let transactionAccount: TransactionAccount;
    before(() => {
      transactionAccount = new TransactionAccount({
        discriminant: new Discriminant({ value: 2 }),
        accounts,
        cryptidAccount: AssignablePublicKey.fromPublicKey(cryptidAccount),
        settingsSequence: 0,
        signers: [
          new TransactionAccountSigner({
            expireTime: new AssignableI64(BigInt(0)),
            signerData: new SigningKeyData({
              key: AssignablePublicKey.fromPublicKey(payer.publicKey),
              extraKeys: [],
            }),
          }),
        ],
        state: TransactionState.ready(),
        transactionInstructions: range(0, randomInt(2, 10)).map(
          () =>
            new InstructionData({
              accounts: range(0, randomInt(0, 10)).map(() =>
                randomTransactionAccountMeta({ accountsNum: accounts.length })
              ),
              data: AssignableBuffer.from(
                range(0, randomInt(10, 100)).map(() => randomInt(0, 256))
              ),
              program_id: randomInt(0, accounts.length),
            })
        ),
      });
    });
    beforeEach(function () {
      sandbox.stub(Connection.prototype, 'getAccountInfo').resolves({
        data: transactionAccount.encode(),
        executable: false,
        lamports: LAMPORTS_PER_SOL,
        owner: DOA_PROGRAM_ID,
      });
    });
    it('should create an execute transaction instruction with connection accounts', async function () {
      const seed = Math.floor(Math.random() * 100000).toString();
      const accounts = range(0, randomInt(2, 10)).map(() => ({
        pubkey: Keypair.generate().publicKey,
        isWritable: randomInt(0, 2) === 1,
        isSigner: randomInt(0, 2) === 1,
      }));
      accounts.push({
        pubkey: crpytidSigner,
        isSigner: true,
        isWritable: randomInt(0, 2) === 1,
      });

      const instruction = await create(
        didPDAKey,
        cryptidAccount,
        seed,
        [normalizeSigner(payer), []],
        new Connection('https://invalid.url')
      );

      expect(instruction.keys.length).to.be.greaterThanOrEqual(6);
      const transactionAccountKey = await deriveTransactionAccount(
        cryptidAccount,
        seed
      );
      const expectedAccounts: ByteKeyMeta[] = [
        {
          pubkey: transactionAccountKey.toBytes(),
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: cryptidAccount.toBytes(),
          isSigner: false,
          isWritable: false,
        },
        { pubkey: didPDAKey.toBytes(), isSigner: false, isWritable: false },
        {
          pubkey: SOL_DID_PROGRAM_ID.toBytes(),
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: payer.publicKey.toBytes(),
          isSigner: true,
          isWritable: false,
        },
        { pubkey: crpytidSigner.toBytes(), isSigner: false, isWritable: true },
      ];
      const byteKeys: ByteKeyMeta[] = instruction.keys
        .slice(0, 6)
        .map((meta) => ({
          ...meta,
          pubkey: meta.pubkey.toBytes(),
        }));
      expect(byteKeys).to.deep.equal(expectedAccounts);
      expect(
        transactionAccount.accounts.map((account) =>
          account.toPublicKey().toBytes()
        )
      ).to.deep.contain.members(
        instruction.keys.slice(6).map((meta) => meta.pubkey.toBytes())
      );
      expect(instruction.data.length).to.equal(1 + 1);
      expect(instruction.data.readUInt8(0)).to.equal(3); // Discriminant
      expect(instruction.data.readUInt8(1)).to.equal(0); // Data
    });
  });
});
