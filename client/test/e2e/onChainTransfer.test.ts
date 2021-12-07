import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
} from '@solana/web3.js';
import {
  deriveDefaultDOA,
  deriveDOASigner,
  didToPDA,
  publicKeyToDid,
} from '../../src/lib/solana/util';
import { airdrop, createTransaction } from '../utils/solana';
import { create as createPropose } from '../../src/lib/solana/instructions/proposeTransaction';
import { create as createExpand } from '../../src/lib/solana/instructions/expandTransaction';
import { create as createExecute } from '../../src/lib/solana/instructions/executeTransaction';
import InstructionData from '../../src/lib/solana/model/InstructionData';
import TransactionAccountMeta from '../../src/lib/solana/model/TransactionAccountMeta';
import { normalizeSigner } from '../../src/lib/util';
import { expect } from 'chai';
import AccountOperation from '../../src/lib/solana/model/AccountOperation';
import AssignablePublicKey from '../../src/lib/solana/model/AssignablePublicKey';
import InstructionOperation from '../../src/lib/solana/model/InstructionOperation';
import { AssignableBuffer } from '../../src/lib/solana/solanaBorsh';

describe('on-chain transfer', function () {
  this.timeout(20_000);

  let connection: Connection;
  let key: Keypair;
  let did: string;
  let didPDAKey: PublicKey;
  let cryptidAccount: PublicKey;
  let cryptidSigner: PublicKey;
  let recipient: PublicKey;

  before(async function () {
    connection = new Connection('http://localhost:8899', 'confirmed');
    key = Keypair.generate();
    did = publicKeyToDid(key.publicKey, 'localnet');
    recipient = Keypair.generate().publicKey;

    cryptidAccount = await deriveDefaultDOA(did);
    cryptidSigner = await deriveDOASigner(cryptidAccount).then((val) => val[0]);

    [didPDAKey] = await Promise.all([
      didToPDA(did),
      airdrop(connection, cryptidSigner, 5 * LAMPORTS_PER_SOL),
      airdrop(connection, key.publicKey, 100_000),
    ]);

    console.log('key: ', key.publicKey.toBase58());
    console.log('didPDA: ', didPDAKey.toBase58());
    console.log('cryptidAccount: ', cryptidAccount.toBase58());
    console.log('cryptidSigner: ', cryptidSigner.toBase58());
    console.log('recipient: ', recipient.toBase58());
    console.log('SystemProgram: ', SystemProgram.programId.toBase58());
  });

  it('should transfer from cryptid to signer and random address', async function () {
    const transactionSeed = 'transaction';

    const transferData = SystemProgram.transfer({
      fromPubkey: PublicKey.default,
      lamports: LAMPORTS_PER_SOL,
      toPubkey: PublicKey.default,
    }).data;

    const startLamports = await LamportsList.fromConnection(connection, {
      key: key.publicKey,
      recipient,
      cryptidSigner,
    });
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
      cryptidAccount,
      transactionSeed,
      [[normalizeSigner(key), []]],
      false,
      { accountSize: 10000 }
    );
    const proposeTransaction = await createTransaction(
      connection,
      key.publicKey,
      [propose]
    );
    await sendAndConfirmTransaction(connection, proposeTransaction, [key]);
    const proposeLamports = await startLamports.checkChanges(connection, {
      key: -5000,
      recipient: 0,
    });

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
            data: new AssignableBuffer(transferData),
          }),
        }),
      ],
      didPDAKey,
      cryptidAccount,
      transactionSeed,
      true,
      [normalizeSigner(key), []]
    );
    const expandTransaction = await createTransaction(
      connection,
      key.publicKey,
      [expand]
    );
    await sendAndConfirmTransaction(connection, expandTransaction, [key]);
    const expandLamports = await proposeLamports.checkChanges(connection, {
      key: -5000,
      cryptidSigner: 0,
      recipient: 0,
    });

    const execute = await createExecute(
      didPDAKey,
      cryptidAccount,
      transactionSeed,
      [normalizeSigner(key), []],
      connection,
      'cryptid'
    );
    const executeTransaction = await createTransaction(
      connection,
      key.publicKey,
      [execute]
    );
    await sendAndConfirmTransaction(connection, executeTransaction, [key]);
    await Promise.all([
      expandLamports.checkChanges(connection, {
        key: -5000 + LAMPORTS_PER_SOL,
        recipient: LAMPORTS_PER_SOL,
      }),
      startLamports.checkChanges(connection, {
        cryptidSigner: 0,
      }),
    ]);
  });
});

type Values<T extends string, U> = {
  [P in T]: U;
};
class LamportsList<T extends string> {
  keysList: Values<T, PublicKey>;
  values: Values<T, number>;

  private constructor(
    keysList: Values<T, PublicKey>,
    values: Values<T, number>
  ) {
    this.keysList = keysList;
    this.values = values;
  }

  async checkChanges(
    connection: Connection,
    changes?: Partial<Values<T, number>>
  ): Promise<LamportsList<T>> {
    const newList = await LamportsList.fromConnection(
      connection,
      this.keysList
    );
    if (changes) {
      for (const key of Object.keys(this.values)) {
        const keyCast = key as keyof Values<T, any>;
        if (changes[keyCast]) {
          expect(
            (this.values[keyCast] as number) + (changes[keyCast] as number),
            `Key ${key}`
          ).to.equal(newList.values[keyCast]);
        }
      }
    }
    return newList;
  }

  static async fromConnection<T extends string>(
    connection: Connection,
    keys: Values<T, PublicKey>
  ): Promise<LamportsList<T>> {
    const keyArray: T[] = Object.keys(keys) as T[];
    const startingValues = {} as Values<T, number>;
    keyArray.forEach((key) => {
      startingValues[key] = 0; // Start them all at 0
    });
    const out = new LamportsList(keys, startingValues);
    await Promise.all(
      keyArray.map((key) =>
        getLamports(connection, keys[key]).then(
          (lamports) => (out.values[key] = lamports)
        )
      )
    );
    return out;
  }
}

async function getLamports(
  connection: Connection,
  key: PublicKey
): Promise<number> {
  return connection.getAccountInfo(key).then((account) => {
    if (!account) {
      return 0;
    }
    return account.lamports;
  });
}
