import {
  AccountMeta,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import { deriveCryptidAccountSigner, deriveDefaultCryptidAccountFromKey } from '../util';
import { CRYPTID_PROGRAM_ID, SOL_DID_PROGRAM_ID } from '../../constants';
import { Signer } from '../../../types/crypto';
import { CryptidInstruction } from './instruction';

export async function create(
  didPDAKey: PublicKey,
  transactionAccount: PublicKey,
  signer: [Signer, AccountMeta[]],
  cryptidAccountData?: PublicKey,
  fundsTo?: 'cryptid' | PublicKey,
): Promise<TransactionInstruction> {
  cryptidAccountData = cryptidAccountData || (await deriveDefaultCryptidAccountFromKey(didPDAKey));
  const cryptidAccountSigner = await deriveCryptidAccountSigner(cryptidAccountData).then((value) => value[0])

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
  ];

  const data: Buffer = CryptidInstruction.cancelTransaction(
    signer[1].length
  ).encode();

  return new TransactionInstruction({
    keys,
    programId: CRYPTID_PROGRAM_ID,
    data,
  });
}
