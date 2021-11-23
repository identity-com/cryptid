import { AccountOperation } from '../model/AccountOperation';
import { InstructionOperation } from '../model/InstructionOperation';
import {
  AccountMeta,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import { Signer } from '../../../types/crypto';
import { deriveTransactionAccount } from '../util';
import { DOA_PROGRAM_ID, SOL_DID_PROGRAM_ID } from '../../constants';
import { CryptidInstruction } from './instruction';
import { TransactionState } from '../model/TransactionState';
import { UnitValue } from '../solanaBorsh';

export async function create(
  accountOperations: AccountOperation[],
  instructionOperations: InstructionOperation[],
  didPDAKey: PublicKey,
  cryptidAccount: PublicKey,
  accountSeed: string,
  readyToExecute: boolean,
  signer: [Signer, AccountMeta[]]
): Promise<TransactionInstruction> {
  const transactionAccount = await deriveTransactionAccount(
    cryptidAccount,
    accountSeed
  );

  const keys: AccountMeta[] = [
    { pubkey: transactionAccount, isWritable: true, isSigner: false },
    { pubkey: cryptidAccount, isWritable: false, isSigner: false },
    { pubkey: didPDAKey, isWritable: false, isSigner: false },
    { pubkey: SOL_DID_PROGRAM_ID, isWritable: false, isSigner: false },
    { pubkey: signer[0].publicKey, isWritable: false, isSigner: true },
    ...signer[1],
  ];

  const data: Buffer = CryptidInstruction.expandTransaction(
    readyToExecute
      ? new TransactionState({ ready: new UnitValue() })
      : new TransactionState({ notReady: new UnitValue() }),
    accountOperations,
    instructionOperations
  ).encode();

  return new TransactionInstruction({
    keys,
    programId: DOA_PROGRAM_ID,
    data,
  });
}
