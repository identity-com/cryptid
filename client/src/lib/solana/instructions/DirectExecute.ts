import {
  AccountMeta,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { Signer } from '../../../types/crypto';
import { deriveDefaultDOA } from '../util';
import { CryptidInstruction } from './instruction';
import { DOA_PROGRAM_ID } from '../../constants';

export const create = async (
  unsignedTransaction: Transaction,
  did: string,
  signer: Signer,
  doa?: PublicKey
): Promise<TransactionInstruction> => {
  // TODO @brett
  const sendingDoa = doa || (await deriveDefaultDOA(did));

  const keys: AccountMeta[] = [
    { pubkey: signer.publicKey, isSigner: true, isWritable: true },
    { pubkey: sendingDoa, isSigner: false, isWritable: false },
  ];

  const serializedTransaction = Array.from(unsignedTransaction.serialize());

  const data = CryptidInstruction.directExecute(serializedTransaction).encode();

  return new TransactionInstruction({
    keys,
    programId: DOA_PROGRAM_ID,
    data,
  });
};
