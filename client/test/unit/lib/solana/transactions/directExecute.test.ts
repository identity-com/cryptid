import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { directExecute } from '../../../../../src/lib/solana/transactions/directExecute';
import {
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { recentBlockhash } from '../../../../utils/solana';
import { publicKeyToDid } from '../../../../../src/lib/solana/util';
import {
  didToDefaultDOASigner,
  normalizeSigner,
} from '../../../../../src/lib/util';
import { stubGetBlockhash } from '../../../../utils/lang';
import { create } from '../../../../../src/lib/solana/instructions/directExecute';

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

  const makeSimpleTransaction = async (): Promise<Transaction> =>
    new Transaction({
      recentBlockhash: await recentBlockhash(),
    }).add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        lamports: 0,
        toPubkey: payer.publicKey,
      })
    );

  it('should create and sign a directExecute transaction', async () => {
    const txToWrap = await makeSimpleTransaction();
    const directExecuteTransaction = await directExecute(
      txToWrap,
      did,
      payer.publicKey,
      [normalizeSigner(payer)]
    );
    expect(directExecuteTransaction.signatures).to.have.length(1);
    expect(
      directExecuteTransaction.signatures[0].publicKey.toString()
    ).to.equal(payer.publicKey.toString());
  });

  it('should sign the directExecute transaction with all passed-in signers', async () => {
    const additionalSigner = Keypair.generate();

    const txToWrap = await makeSimpleTransaction();
    const directExecuteTransaction = await directExecute(
      txToWrap,
      did,
      payer.publicKey,
      [normalizeSigner(payer), normalizeSigner(additionalSigner)]
    );
    expect(directExecuteTransaction.signatures).to.have.length(2);
    expect(
      directExecuteTransaction.signatures[1].publicKey.toString()
    ).to.equal(additionalSigner.publicKey.toString());
  });

  it('should create a direct execute', async () => {
    const duplicatedKey = Keypair.generate().publicKey;
    const additionalKey = Keypair.generate().publicKey;
    const instruction = new TransactionInstruction({
      keys: [
        {
          pubkey: duplicatedKey,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: additionalKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: duplicatedKey,
          isSigner: true,
          isWritable: true,
        },
      ],
      programId: Keypair.generate().publicKey,
    });

    const transaction = new Transaction();
    transaction.add(instruction);
    const didPDAKey = Keypair.generate().publicKey;

    console.log(
      instruction.keys.map((key) => ({
        ...key,
        pubkey: key.pubkey.toBase58(),
      }))
    );

    console.log('duplicated key ' + duplicatedKey.toBase58());
    console.log('additional key ' + additionalKey.toBase58());
    console.log('payer ' + payer.publicKey.toBase58());
    console.log('didPDA ' + didPDAKey.toBase58());

    const direct_execute = (
      await create(transaction, didPDAKey, [[normalizeSigner(payer), []]])
    )[0];

    console.log(
      direct_execute.keys.map((key) => ({
        ...key,
        pubkey: key.pubkey.toBase58(),
      }))
    );
    expect(direct_execute.keys.map((key) => key.pubkey.toBase58()))
      .to.contain(instruction.keys[0].pubkey.toBase58())
      .and.to.contain(instruction.keys[1].pubkey.toBase58());
  });

  it('should sign the directExecute transaction for create', async () => {
    const didPDAKey = await didToDefaultDOASigner(did);

    const txToWrap = new Transaction({
      recentBlockhash: await recentBlockhash(),
    })
      .add(
        // Simple Transfer instruction
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          lamports: 0,
          toPubkey: payer.publicKey,
        })
      )
      .add(
        // Large create account instruction
        SystemProgram.createAccount({
          programId: Keypair.generate().publicKey,
          space: 10241,
          lamports: 1024,
          fromPubkey: didPDAKey,
          newAccountPubkey: payer.publicKey,
        })
      )
      .add(
        // Small create account instruction
        SystemProgram.createAccount({
          programId: Keypair.generate().publicKey,
          space: 1024,
          lamports: 1024,
          fromPubkey: payer.publicKey,
          newAccountPubkey: payer.publicKey,
        })
      )
      .add(
        // Large allocate
        SystemProgram.allocate({
          accountPubkey: payer.publicKey,
          space: 10241,
        })
      )
      .add(
        // Small allocate
        SystemProgram.allocate({
          accountPubkey: payer.publicKey,
          space: 1024,
        })
      );
    const directExecuteTransaction = await directExecute(
      txToWrap,
      did,
      payer.publicKey,
      [normalizeSigner(payer)]
    );

    expect(txToWrap.instructions.length).to.equal(5);
    // expect one extra instruction for the transfer before large create
    expect(directExecuteTransaction.instructions.length).to.equal(6);
  });
});
