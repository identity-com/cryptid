import {
  AccountMeta,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { Signer } from '../../../types/crypto';
import { deriveDefaultDOA, deriveDOASigner } from '../util';
import { CryptidInstruction } from './instruction';
import { DOA_PROGRAM_ID, SOL_DID_PROGRAM_ID } from '../../constants';
import { DecentralizedIdentifier } from '@identity.com/sol-did-client';
import { any, find, propEq } from 'ramda';
import { InstructionData } from '../model/InstructionData';
import { TransactionAccountMeta } from '../model/TransactionAccountMeta';
import { AssignablePublicKey } from '../model/AssignablePublicKey';

export const create = async (
  unsignedTransaction: Transaction,
  did: string,
  signers: Signer[],
  doa?: PublicKey
): Promise<TransactionInstruction> => {
  const sendingDoa = doa || (await deriveDefaultDOA(did));
  const did_identifier = DecentralizedIdentifier.parse(did);
  const doa_signer_key = await deriveDOASigner(sendingDoa).then(
    (signer) => signer[0]
  );

  const instruction_accounts: AccountMeta[] = [];
  unsignedTransaction.instructions.forEach((instruction) => {
    if (!any(propEq('pubkey', instruction.programId))(instruction_accounts)) {
      instruction_accounts.push({
        pubkey: instruction.programId,
        isSigner: false,
        isWritable: false,
      });
    }

    instruction.keys.forEach((account) => {
      const found: AccountMeta | undefined = find<AccountMeta>(
        propEq('pubkey', account.pubkey)
      )(instruction_accounts);
      if (found) {
        found.isSigner =
          found.isSigner ||
          (account.pubkey != doa_signer_key && account.isSigner);
        found.isWritable = found.isWritable || account.isWritable;
      } else {
        instruction_accounts.push({
          ...account,
          isSigner: false,
        });
      }
    });
  });

  const keys: AccountMeta[] = [
    { pubkey: sendingDoa, isSigner: false, isWritable: false },
    {
      pubkey: await did_identifier.pdaSolanaPubkey(),
      isSigner: false,
      isWritable: false,
    },
    { pubkey: SOL_DID_PROGRAM_ID, isSigner: false, isWritable: false },
    ...signers.map((signer) => ({
      pubkey: signer.publicKey,
      isSigner: true,
      isWritable: false,
    })),
    ...instruction_accounts,
  ];

  const instructions: InstructionData[] = unsignedTransaction.instructions.map(
    (instruction) =>
      new InstructionData({
        program_id: AssignablePublicKey.fromPublicKey(instruction.programId),
        accounts: instruction.keys.map(TransactionAccountMeta.fromAccountMeta),
        data: instruction.data,
      })
  );

  const data = CryptidInstruction.directExecute(
    signers.length,
    instructions
  ).encode();

  return new TransactionInstruction({
    keys,
    programId: DOA_PROGRAM_ID,
    data,
  });
};
