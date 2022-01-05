import {
  AccountMeta,
  CreateAccountParams,
  CreateAccountWithSeedParams,
  PublicKey,
  SystemInstruction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { Signer } from '../../../types/crypto';
import { deriveDefaultDOAFromKey, deriveDOASigner } from '../util';
import { CryptidInstruction } from './instruction';
import { CRYPTID_PROGRAM_ID, SOL_DID_PROGRAM_ID } from '../../constants';
import { find, propEq } from 'ramda';
import { InstructionData } from '../model/InstructionData';

export const create = async (
  unsignedTransaction: Transaction,
  didPDAKey: PublicKey,
  signers: [Signer, AccountMeta[]][],
  doa?: PublicKey,
  debug = false
): Promise<TransactionInstruction[]> => {
  const cryptidAccount: PublicKey =
    doa || (await deriveDefaultDOAFromKey(didPDAKey));

  const cryptidSignerKey: PublicKey = await deriveDOASigner(
    cryptidAccount
  ).then((signer) => signer[0]);

  if (signers.length < 1) {
    throw new Error('Not enough signers for directExecute');
  }

  const instructionList: TransactionInstruction[] = [];

  // check each instruction and add to the list, wrapping as needed
  unsignedTransaction.instructions.forEach((instruction) => {
    addTransaction(
      instruction,
      instructionList,
      didPDAKey,
      signers,
      cryptidAccount,
      cryptidSignerKey,
      debug
    );
  });

  return instructionList;
};

function convertToDirectExecute(
  instructions: TransactionInstruction[],
  didPDAKey: PublicKey,
  signers: [Signer, AccountMeta[]][],
  cryptidAccount: PublicKey,
  cryptidSignerKey: PublicKey,
  debug: boolean
): TransactionInstruction {
  const instruction_accounts: AccountMeta[] = [];
  instructions.forEach((instruction) => {
    // Add the program that will be called as not a signer and not writable
    addMetaUnique(
      instruction_accounts,
      { pubkey: instruction.programId, isSigner: false, isWritable: false },
      cryptidSignerKey
    );

    // Add each instruction's key, order doesn't matter to the program
    instruction.keys.forEach((account) =>
      addMetaUnique(instruction_accounts, account, cryptidSignerKey)
    );
  });

  const keys: AccountMeta[] = [
    { pubkey: cryptidAccount, isSigner: false, isWritable: false },
    { pubkey: didPDAKey, isSigner: false, isWritable: false },
    { pubkey: SOL_DID_PROGRAM_ID, isSigner: false, isWritable: false },
    ...signers.flatMap(([signer, extras]) => [
      { pubkey: signer.publicKey, isSigner: true, isWritable: false },
      ...extras,
    ]),
    ...instruction_accounts,
  ];

  const directExecuteInstructions: InstructionData[] = instructions.map(
    (instruction) =>
      InstructionData.fromTransactionInstruction(
        instruction,
        instruction_accounts.map((account) => account.pubkey)
      )
  );

  const data: Buffer = CryptidInstruction.directExecute(
    // Map into number of extra accounts array
    signers.map((extra_accounts) => extra_accounts[1].length),
    directExecuteInstructions,
    debug
  ).encode();

  return new TransactionInstruction({
    keys,
    programId: CRYPTID_PROGRAM_ID,
    data,
  });
}

function addTransaction(
  instruction: TransactionInstruction,
  instructionList: TransactionInstruction[],
  didPDAKey: PublicKey,
  signers: [Signer, AccountMeta[]][],
  cryptidAccount: PublicKey,
  cryptidSignerKey: PublicKey,
  debug: boolean
) {
  const firstSigner = signers[0][0].publicKey;
  const MAX_PROGRAM_SIZE = 10240;
  if (instruction.programId.equals(SystemProgram.programId)) {
    const type = SystemInstruction.decodeInstructionType(instruction);
    if (type === 'Create' || type === 'CreateWithSeed') {
      const create =
        type === 'Create'
          ? SystemInstruction.decodeCreateAccount(instruction)
          : SystemInstruction.decodeCreateWithSeed(instruction);

      if (create.space > MAX_PROGRAM_SIZE) {
        // If funder is our signer we transfer to the signing key and then use those funds for the creation
        if (create.fromPubkey.equals(cryptidSignerKey)) {
          const transferInstruction = SystemProgram.transfer({
            fromPubkey: cryptidSignerKey,
            lamports: create.lamports,
            toPubkey: firstSigner,
          });

          instructionList.push(
            convertToDirectExecute(
              [transferInstruction],
              didPDAKey,
              signers,
              cryptidAccount,
              cryptidSignerKey,
              debug
            )
          );

          const createInstruction =
            type === 'Create'
              ? SystemProgram.createAccount({
                  ...(create as CreateAccountParams),
                  fromPubkey: firstSigner,
                })
              : SystemProgram.createAccountWithSeed({
                  ...(create as CreateAccountWithSeedParams),
                  fromPubkey: firstSigner,
                });

          instructionList.push(createInstruction);

          return;
        } else {
          instructionList.push(instruction);

          return;
        }
      }
    } else if (type === 'Allocate' || type === 'AllocateWithSeed') {
      // Allocate doesn't transfer funds so just run it outside unless it's small enough or our signer is involved
      const allocate =
        type === 'Allocate'
          ? SystemInstruction.decodeAllocate(instruction)
          : SystemInstruction.decodeAllocateWithSeed(instruction);

      if (
        allocate.space > MAX_PROGRAM_SIZE &&
        !allocate.accountPubkey.equals(cryptidSignerKey)
      ) {
        instructionList.push(instruction);

        return;
      }
    }
  }

  instructionList.push(
    convertToDirectExecute(
      [instruction],
      didPDAKey,
      signers,
      cryptidAccount,
      cryptidSignerKey,
      debug
    )
  );
}

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
