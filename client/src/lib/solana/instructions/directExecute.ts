import {
  AccountMeta,
  PublicKey,
  SystemInstruction,
  SystemProgram,
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
): Promise<TransactionInstruction[]> => {
  const cryptidAccount: PublicKey =
    doa || (await deriveDefaultDOAFromKey(didPDAKey));

  const cryptidSignerKey: PublicKey = await deriveDOASigner(
    cryptidAccount
  ).then((signer) => signer[0]);

  if (signers.length < 1) {
    throw new Error('Not enough signers for directExecute');
  }

  const instructionsLists = convertInstructions(
    unsignedTransaction.instructions,
    cryptidSignerKey,
    signers[0][0].publicKey
  );

  const convertOrPassthroughInstructions = ([instructions, shouldUseDirectExecute]: [TransactionInstruction[], boolean]) => {
    if (!shouldUseDirectExecute) return instructions;

    if (instructions.length === 0) {
      // `convertToDirectExecute` will build an instruction if given an empty array, this catches that case and prevents excess instructions
      return [];
    }

    // otherwise the transactions should be converted
    const directExecuteInstruction = convertToDirectExecute(
      instructions,
      didPDAKey,
      signers,
      cryptidAccount,
      cryptidSignerKey,
      debug
    );
    return [directExecuteInstruction];
  };

  return instructionsLists.flatMap(convertOrPassthroughInstructions);
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
    programId: DOA_PROGRAM_ID,
    data,
  });
}

/**
 * Returns an array of arrays of transaction instructions with a boolean telling if they should be run as a direct execute
 * @param instructions The instructions to convert.
 * @param signerKey The cryptid signer key
 * @param firstSigner The first signer in the list of signers
 */
// TODO: Make this actually look for instruction dependencies rather than just assuming creates and allocates all go before others, some may rely on instructions that are not create/allocate
function convertInstructions(
  instructions: TransactionInstruction[],
  signerKey: PublicKey,
  firstSigner: PublicKey
): [TransactionInstruction[], boolean][] {
  const out: ReturnType<typeof convertInstructions> = [
    [[], true],
    [[], false],
    [[], true],
  ];
  const beforeInstructions = out[0][0];
  const middleInstructions = out[1][0];
  const afterInstructions = out[2][0];

  for (const instruction of instructions) {
    const convert = convertInstruction(instruction, signerKey, firstSigner);
    beforeInstructions.push(...convert.before);
    middleInstructions.push(...convert.middle);
    afterInstructions.push(...convert.after);
  }

  return out;
}

// Returns before, middle, after wh
function convertInstruction(
  instruction: TransactionInstruction,
  signerKey: PublicKey,
  firstSigner: PublicKey
): {
  before: TransactionInstruction[];
  middle: TransactionInstruction[];
  after: TransactionInstruction[];
} {
  // Must handle case where trying to allocate account with greater than 10240 bytes of space
  if (instruction.programId.equals(SystemProgram.programId)) {
    const type = SystemInstruction.decodeInstructionType(instruction);
    if (type === 'Create') {
      const create = SystemInstruction.decodeCreateAccount(instruction);
      if (create.space > 10240) {
        // If large enough space required do allocation outside direct execute
        if (create.fromPubkey.equals(signerKey)) {
          // If funder is our signer we transfer to the signing key and then use those funds for the creation
          return {
            before: [
              SystemProgram.transfer({
                fromPubkey: signerKey,
                lamports: create.lamports,
                toPubkey: firstSigner,
              }),
            ],
            middle: [
              SystemProgram.createAccount({
                ...create,
                fromPubkey: firstSigner,
              }),
            ],
            after: [],
          };
        } else {
          // If not our key run it outside the direct execute
          return {
            before: [],
            middle: [instruction],
            after: [],
          };
        }
      }
    } else if (type === 'CreateWithSeed') {
      // If large enough space required do allocation outside direct execute
      const create = SystemInstruction.decodeCreateWithSeed(instruction);
      if (create.space > 10240) {
        if (create.fromPubkey.equals(signerKey)) {
          // If funder is our signer we transfer to the signing key and then use those funds for the creation
          return {
            before: [
              SystemProgram.transfer({
                fromPubkey: signerKey,
                lamports: create.lamports,
                toPubkey: firstSigner,
              }),
            ],
            middle: [
              SystemProgram.createAccountWithSeed({
                ...create,
                fromPubkey: firstSigner,
              }),
            ],
            after: [],
          };
        } else {
          // If not our key run it outside the direct execute
          return {
            before: [],
            middle: [instruction],
            after: [],
          };
        }
      }
    } else if (type === 'Allocate' || type === 'AllocateWithSeed') {
      // Allocate doesn't transfer funds so just run it outside unless it's small enough or our signer is involved
      let allocateSize: number;
      let allocateAccount: PublicKey;
      if (type === 'Allocate') {
        const allocate = SystemInstruction.decodeAllocate(instruction);
        allocateSize = allocate.space;
        allocateAccount = allocate.accountPubkey;
      } else {
        const allocate = SystemInstruction.decodeAllocateWithSeed(instruction);
        allocateSize = allocate.space;
        allocateAccount = allocate.accountPubkey;
      }
      if (allocateSize > 10240 && !allocateAccount.equals(signerKey)) {
        return {
          before: [],
          middle: [instruction],
          after: [],
        };
      }
    }
  }
  return {
    before: [],
    middle: [],
    after: [instruction],
  };
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
