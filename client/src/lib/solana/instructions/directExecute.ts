import {
  AccountMeta,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { Signer } from '../../../types/crypto';
import { deriveDefaultDOAFromKey, deriveDOASigner } from '../util';
import { CryptidInstruction } from './instruction';
import { DOA_PROGRAM_ID, SOL_DID_PROGRAM_ID } from '../../constants';
import { find, propEq } from 'ramda';
import { InstructionData } from '../model/InstructionData';

export const create = async (
  unsignedTransaction: Transaction,
  didPDAKey: PublicKey,
  signers: [Signer, AccountMeta[]][],
  doa?: PublicKey,
  debug = false
): Promise<TransactionInstruction> => {
  const sendingDoa: PublicKey =
    doa || (await deriveDefaultDOAFromKey(didPDAKey));

  const doa_signer_key: PublicKey = await deriveDOASigner(sendingDoa).then(
    (signer) => signer[0]
  );

  const instruction_accounts: AccountMeta[] = [];
  unsignedTransaction.instructions.forEach((instruction) => {
    // Add the program that will be called as not a signer and not writable
    addMetaUnique(
      instruction_accounts,
      { pubkey: instruction.programId, isSigner: false, isWritable: false },
      doa_signer_key
    );

    // Add each instruction's key, order doesn't matter to the program
    instruction.keys.forEach((account) =>
      addMetaUnique(instruction_accounts, account, doa_signer_key)
    );
  });

  const keys: AccountMeta[] = [
    { pubkey: sendingDoa, isSigner: false, isWritable: false },
    { pubkey: didPDAKey, isSigner: false, isWritable: false },
    { pubkey: SOL_DID_PROGRAM_ID, isSigner: false, isWritable: false },
    ...signers.flatMap(([signer, extras]) => [
      { pubkey: signer.publicKey, isSigner: true, isWritable: false },
      ...extras,
    ]),
    ...instruction_accounts,
  ];

  const instructions: InstructionData[] = unsignedTransaction.instructions.map(
    InstructionData.fromTransactionInstruction
  );

  const data: Buffer = CryptidInstruction.directExecute(
    // Map into number of extra accounts array
    signers.map((extra_accounts) => extra_accounts[1].length),
    instructions,
    debug
  ).encode();

  return new TransactionInstruction({
    keys,
    programId: DOA_PROGRAM_ID,
    data,
  });
};

const addMetaUnique = (
  array: AccountMeta[],
  add: AccountMeta,
  doa_signer_key: PublicKey
) => {
  const found: AccountMeta | undefined = find<AccountMeta>(
    propEq('pubkey', add.pubkey)
  )(array);
  if (found) {
    // Instruction account already present
    // Make signer if new is signer and not the doa signer
    found.isSigner =
      found.isSigner || (add.isSigner && !add.pubkey.equals(doa_signer_key));
    // Make writable if new is writable
    found.isWritable = found.isWritable || add.isWritable;
  } else {
    // Instruction account not present, add it
    array.push({
      ...add,
      // Don't make signer if is doa signer
      isSigner: add.isSigner && !add.pubkey.equals(doa_signer_key),
    });
  }
};
