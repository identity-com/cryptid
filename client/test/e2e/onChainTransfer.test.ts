import {
  Connection,
  FeeCalculator,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
} from '@solana/web3.js';
import {
  deriveDefaultCryptidAccount,
  deriveCryptidAccountSigner,
  didToPDA,
  publicKeyToDid,
} from '../../src/lib/solana/util';
import { airdrop, Balances, createTransaction } from '../utils/solana';
import { create as createPropose } from '../../src/lib/solana/instructions/proposeTransaction';
import { create as createExpand } from '../../src/lib/solana/instructions/expandTransaction';
import { create as createExecute } from '../../src/lib/solana/instructions/executeTransaction';
import InstructionData from '../../src/lib/solana/model/InstructionData';
import TransactionAccountMeta from '../../src/lib/solana/model/TransactionAccountMeta';
import { normalizeSigner } from '../../src/lib/util';
import { expect } from 'chai';
import AccountOperation from '../../src/lib/solana/model/AccountOperation';
import AssignablePublicKey from '../../src/lib/solana/model/AssignablePublicKey';
import InstructionOperation, {
  AddData,
} from '../../src/lib/solana/model/InstructionOperation';
import { AssignableBuffer } from '../../src/lib/solana/solanaBorsh';

const ACCOUNT_SIZE = 10000;

describe('on-chain transfer', function () {
  this.timeout(20_000);

  let connection: Connection;
  let key: Keypair;
  let did: string;
  let didPDAKey: PublicKey;
  let cryptidAccount: PublicKey;
  let cryptidSigner: PublicKey;
  let recipient: PublicKey;
  let feeCalculator: FeeCalculator;
  let balances: Balances;

  before(async () => {
    connection = new Connection('http://localhost:8899', 'confirmed');
    key = Keypair.generate();
    did = publicKeyToDid(key.publicKey, 'localnet');
    recipient = Keypair.generate().publicKey;

    cryptidAccount = await deriveDefaultCryptidAccount(did);
    cryptidSigner = await deriveCryptidAccountSigner(cryptidAccount).then(
      ([val]) => val
    );

    feeCalculator = (await connection.getRecentBlockhash()).feeCalculator;

    [didPDAKey] = await Promise.all([
      didToPDA(did),
      airdrop(connection, cryptidSigner, 5 * LAMPORTS_PER_SOL),
      airdrop(connection, key.publicKey, LAMPORTS_PER_SOL),
    ]);

    console.log('key: ', key.publicKey.toBase58());
    console.log('didPDA: ', didPDAKey.toBase58());
    console.log('cryptidAccount: ', cryptidAccount.toBase58());
    console.log('cryptidSigner: ', cryptidSigner.toBase58());
    console.log('recipient: ', recipient.toBase58());
    console.log('SystemProgram: ', SystemProgram.programId.toBase58());
  });

  it.skip('should transfer from cryptid to signer and random address', async () => {
    const transactionSeed = 'transaction';

    const transferData = SystemProgram.transfer({
      fromPubkey: PublicKey.default,
      lamports: LAMPORTS_PER_SOL, // 1 SOL
      toPubkey: PublicKey.default,
    }).data;

    balances = await new Balances(connection).register(
      cryptidSigner, // controlled cryptid
      key.publicKey, // controller signer
      recipient
    );

    const propose = await createPropose(
      [SystemProgram.programId, cryptidSigner, key.publicKey],
      [
        new InstructionData({
          program_id: 0,
          accounts: [
            TransactionAccountMeta.fromIndexAndMeta(1, true, true),
            TransactionAccountMeta.fromIndexAndMeta(2, false, true),
          ],
          data: new AssignableBuffer(transferData),
        }),
      ],
      didPDAKey,
      'cryptid',
      transactionSeed,
      [[normalizeSigner(key), []]],
      false,
      cryptidAccount,
      { accountSize: ACCOUNT_SIZE }
    );

    const rent = await connection.getMinimumBalanceForRentExemption(
      ACCOUNT_SIZE
    );

    const proposeTransaction = await createTransaction(
      connection,
      key.publicKey,
      [propose]
    );

    await balances.recordBefore();

    await sendAndConfirmTransaction(connection, proposeTransaction, [key]);

    await balances.recordAfter();

    expect(balances.for(key.publicKey)).to.equal(
      -feeCalculator.lamportsPerSignature
    );
    expect(balances.for(cryptidSigner)).to.equal(-rent);
    expect(balances.for(recipient)).to.equal(0);

    const expand = await createExpand(
      [
        new AccountOperation({
          add: AssignablePublicKey.fromPublicKey(recipient),
        }),
      ],
      [
        new InstructionOperation({
          push: new InstructionData({
            program_id: 0,
            accounts: [
              TransactionAccountMeta.fromIndexAndMeta(1, true, true),
              TransactionAccountMeta.fromIndexAndMeta(3, false, true),
            ],
            data: AssignableBuffer.from([]),
          }),
        }),
      ],
      didPDAKey,
      transactionSeed,
      false,
      [normalizeSigner(key), []],
      cryptidAccount
    );
    const expandTransaction = await createTransaction(
      connection,
      key.publicKey,
      [expand]
    );
    await balances.recordBefore();
    await sendAndConfirmTransaction(connection, expandTransaction, [key]);
    await balances.recordAfter();

    expect(balances.for(key.publicKey)).to.equal(
      -feeCalculator.lamportsPerSignature
    );
    expect(balances.for(cryptidSigner)).to.equal(0);
    expect(balances.for(recipient)).to.equal(0);

    // expand with data
    const expandData = await createExpand(
      [],
      [
        new InstructionOperation({
          addData: new AddData({
            index: 1,
            data: new AssignableBuffer(transferData),
          }),
        }),
      ],
      didPDAKey,
      transactionSeed,
      true,
      [normalizeSigner(key), []], // TODO: Brett why is this not array? (as with propose). e.g. signers
      cryptidAccount
    );

    const expandDataTransaction = await createTransaction(
      connection,
      key.publicKey,
      [expandData]
    );

    await balances.recordBefore();
    await sendAndConfirmTransaction(connection, expandDataTransaction, [key]);
    await balances.recordAfter();

    expect(balances.for(key.publicKey)).to.equal(
      -feeCalculator.lamportsPerSignature
    );
    expect(balances.for(cryptidSigner)).to.equal(0);
    expect(balances.for(recipient)).to.equal(0);

    const execute = await createExecute(
      didPDAKey,
      transactionSeed,
      [normalizeSigner(key), []], // TODO: Brett why is this not array? (as with propose). e.g. signers
      connection,
      cryptidAccount,
      'cryptid'
    );
    const executeTransaction = await createTransaction(
      connection,
      key.publicKey,
      [execute]
    );
    await balances.recordBefore();
    await sendAndConfirmTransaction(connection, executeTransaction, [key]);
    await balances.recordAfter();

    expect(balances.for(key.publicKey)).to.equal(
      -feeCalculator.lamportsPerSignature + LAMPORTS_PER_SOL
    );
    expect(balances.for(cryptidSigner)).to.equal(-2 * LAMPORTS_PER_SOL + rent); // calculate rent
    expect(balances.for(recipient)).to.equal(LAMPORTS_PER_SOL);
  });
});
