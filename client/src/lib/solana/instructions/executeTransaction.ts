import {
  AccountMeta,
  Connection,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import { deriveDOASigner, deriveTransactionAccount } from '../util';
import { CRYPTID_PROGRAM_ID, SOL_DID_PROGRAM_ID } from '../../constants';
import { Signer } from '../../../types/crypto';
import { CryptidInstruction } from './instruction';
import TransactionAccount from '../accounts/TransactionAccount';

export async function create(
  didPDAKey: PublicKey,
  cryptidAccount: PublicKey,
  accountSeed: string,
  signer: [Signer, AccountMeta[]],
  executionMethod: Connection | AccountMeta[],
  fundsTo?: 'cryptid' | PublicKey
): Promise<TransactionInstruction> {
  const transactionAccount = await deriveTransactionAccount(
    cryptidAccount,
    accountSeed
  );

  let executionAccounts: AccountMeta[];

  if (Array.isArray(executionMethod)) {
    executionAccounts = executionMethod;
  } else {
    const [account, cryptidSigner] = await Promise.all([
      executionMethod.getAccountInfo(transactionAccount),
      deriveDOASigner(cryptidAccount).then((val) => val[0]),
    ]);
    if (!account) {
      throw new Error(`Unknown transaction account for seed ${accountSeed}`);
    }
    const transaction = TransactionAccount.decode(
      account.data,
      TransactionAccount
    );
    const tempExecutionAccounts = transaction.accounts.map((key) => ({
      pubkey: key.toPublicKey(),
      isWritable: false,
      isSigner: false,
      exists: false,
    }));

    transaction.transactionInstructions
      .flatMap((instruction) => instruction.accounts)
      .forEach((meta) => {
        const account = tempExecutionAccounts[meta.key];
        account.exists = true;
        account.isSigner ||=
          meta.isSigner() &&
          !transaction.accounts[meta.key].toPublicKey().equals(cryptidSigner);
        account.isWritable ||= meta.isWritable();
      });
    transaction.transactionInstructions.forEach(
      (instruction) =>
        (tempExecutionAccounts[instruction.program_id].exists = true)
    );

    executionAccounts = tempExecutionAccounts
      .filter(({ exists }) => exists)
      .map((meta) => {
        const account: AccountMeta & { exists?: boolean } = meta;
        delete account.exists;
        return account;
      });
  }

  const keys: AccountMeta[] = [
    { pubkey: transactionAccount, isWritable: true, isSigner: false },
    { pubkey: cryptidAccount, isWritable: false, isSigner: false },
    { pubkey: didPDAKey, isWritable: false, isSigner: false },
    { pubkey: SOL_DID_PROGRAM_ID, isWritable: false, isSigner: false },
    { pubkey: signer[0].publicKey, isWritable: false, isSigner: true },
    ...signer[1],
    {
      pubkey:
        fundsTo && fundsTo !== 'cryptid'
          ? fundsTo
          : await deriveDOASigner(cryptidAccount).then((value) => value[0]),
      isWritable: true,
      isSigner: false,
    },
    ...executionAccounts,
  ];

  const data: Buffer = CryptidInstruction.executeTransaction(
    signer[1].length
  ).encode();

  return new TransactionInstruction({
    keys,
    programId: CRYPTID_PROGRAM_ID,
    data,
  });
}
