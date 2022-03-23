import {
  AccountMeta,
  Connection,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import { deriveCryptidAccountSigner, deriveDefaultCryptidAccountFromKey, deriveTransactionAccount } from '../util';
import { CRYPTID_PROGRAM_ID, SOL_DID_PROGRAM_ID } from '../../constants';
import { Signer } from '../../../types/crypto';
import { CryptidInstruction } from './instruction';
import { getExecutionAccounts } from "../transactions/util";

export async function create(
  didPDAKey: PublicKey,
  accountSeed: string,
  signer: [Signer, AccountMeta[]],
  executionMethod: Connection | AccountMeta[],
  cryptidAccountData?: PublicKey,
  fundsTo?: 'cryptid' | PublicKey,
): Promise<TransactionInstruction> {
  cryptidAccountData = cryptidAccountData || (await deriveDefaultCryptidAccountFromKey(didPDAKey));
  const cryptidAccountSigner = await deriveCryptidAccountSigner(cryptidAccountData).then((value) => value[0])

  const transactionAccount = await deriveTransactionAccount(
    cryptidAccountData,
    accountSeed
  );

  let executionAccounts: AccountMeta[];

  if (Array.isArray(executionMethod)) {
    executionAccounts = executionMethod;
  } else {
    executionAccounts = await getExecutionAccounts(
      executionMethod,
      cryptidAccountData,
      transactionAccount,
      accountSeed
    );
  }

  // make sure CryptidSigner is not marked as isSigner
  const cryptidAccountSignerIdx = executionAccounts.findIndex(
    (account) => account.pubkey.equals(cryptidAccountSigner)
  );
  if (cryptidAccountSignerIdx !== -1) {
    executionAccounts[cryptidAccountSignerIdx].isSigner = false;
  }

  const keys: AccountMeta[] = [
    { pubkey: transactionAccount, isWritable: true, isSigner: false },
    { pubkey: cryptidAccountData, isWritable: false, isSigner: false },
    { pubkey: didPDAKey, isWritable: false, isSigner: false },
    { pubkey: SOL_DID_PROGRAM_ID, isWritable: false, isSigner: false },
    { pubkey: signer[0].publicKey, isWritable: false, isSigner: true },
    ...signer[1],
    {
      pubkey:
        fundsTo && fundsTo !== 'cryptid'
          ? fundsTo
          : cryptidAccountSigner,
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
