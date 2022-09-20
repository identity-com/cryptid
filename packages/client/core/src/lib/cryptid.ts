import {AccountMeta, PublicKey, TransactionInstruction} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import {DID_SOL_PROGRAM} from "@identity.com/sol-did-client";
import {
  CRYPTID_PROGRAM,
} from "../constants";
import {InstructionData, TransactionAccountMeta} from "../types";
import BN from "bn.js";
import {Program} from "@project-serum/anchor";
import {Cryptid} from "@identity.com/cryptid-idl";
import {uniqBy} from "ramda";
import {didToPDA} from "./did";
import {CryptidAccountDetails} from "./CryptidAccountDetails";

// Creates a reference to an account, that is passed as part of cryptid instruction data for each account.
const toTransactionAccountMeta = (publicKeyIndex: number, isWritable: boolean = false, isSigner: boolean = false): TransactionAccountMeta => ({
  key: publicKeyIndex,
  meta: (+isWritable << 1) | +isSigner,
})

// Creates a reference to an account, that is passed as part of cryptid instruction data for each account.
const fromTransactionAccountMeta = (tam: TransactionAccountMeta, account: PublicKey): AccountMeta => ({
  pubkey: account,
  isWritable: !!(tam.meta & 2),
  isSigner: !!(tam.meta & 1),
})

// Given an instruction, and an array of accounts, convert it to a sparse `InstructionData` object, for passing
// into a cryptid meta-instruction
export const toInstructionData = (accounts: PublicKey[]) => (instruction: TransactionInstruction):InstructionData => {
  const {programId, data} = instruction;
  const programIndex = accounts.findIndex(a => a.equals(programId));
  const accountMetas = instruction.keys.map(
    ({pubkey, isSigner, isWritable}) =>
      toTransactionAccountMeta(accounts.findIndex(a => a.equals(pubkey)), isWritable, isSigner)
  );
  return {
    programId: programIndex,
    data,
    accounts: accountMetas,
  }
}

// Given a set of accountMetas from a set of instructions, combine them, setting the signer and writable flags to true,
// if any of the instructions require them.
// Note, the cryptid account is not a signer of any instructions, since the program "signs".
const accountMetaReducer = (cryptidAccount: CryptidAccountDetails) => (accumulator: { [k: string]: AccountMeta }, { pubkey, isSigner, isWritable }: AccountMeta):{ [k: string]: AccountMeta } => {
  const isCryptidAccountMeta = (accountMeta: AccountMeta) => accountMeta.pubkey.equals(cryptidAccount.address);

  const mergeAccountMetas = (existingAccountMeta: AccountMeta | undefined, newAccountMeta: AccountMeta):AccountMeta => {
    const mergedAccountMeta = existingAccountMeta ? {
      pubkey: newAccountMeta.pubkey,
      isSigner: existingAccountMeta.isSigner || newAccountMeta.isSigner,
      isWritable: existingAccountMeta.isWritable || newAccountMeta.isWritable
    } : newAccountMeta;

    // if the key is the cryptid account, do not set it as a signer, as it will be "signed" by the
    // cryptid program
    if (isCryptidAccountMeta(mergedAccountMeta)) {
      mergedAccountMeta.isSigner = false;
    }
    return mergedAccountMeta;
  }

  return ({
    ...accumulator,
    [pubkey.toBase58()]: mergeAccountMetas(accumulator[pubkey.toBase58()], {pubkey, isSigner, isWritable})
  });
};

// Extract all account public keys from the instructions, remove duplicates, and return them as an array
export const extractAccountMetas = (instructions: TransactionInstruction[], cryptidAccount: CryptidAccountDetails):AccountMeta[] =>
  Object.values(
    instructions
      .flatMap(instruction => [...instruction.keys, toAccountMeta(instruction.programId, false, false)])
      .reduce(accountMetaReducer(cryptidAccount), {})
  )

export const toAccountMeta = (publicKey: PublicKey, isWritable: boolean = false, isSigner: boolean = false): AccountMeta => ({
  pubkey: publicKey,
  isWritable,
  isSigner,
})

// Convert TransactionAccountMetas, with an array of accounts, into Solana Account Metas
// TODO encapsulate in CryptidTransaction perhaps?
export const transactionAccountMetasToAccountMetas =
  (transactionAccountMetas: TransactionAccountMeta[], accounts: PublicKey[], cryptidAccount: CryptidAccountDetails):AccountMeta[] =>
    Object.values(
      transactionAccountMetas.map(tam => fromTransactionAccountMeta(tam, accounts[tam.key])).reduce(accountMetaReducer(cryptidAccount), {})
    )

export const uniqueKeys = uniqBy<PublicKey, string>(k => k.toBase58())

export const getCryptidAccountAddress = (didAccount: PublicKey, index: number = 0): [PublicKey, number] => PublicKey.findProgramAddressSync(
  [
    anchor.utils.bytes.utf8.encode("cryptid_account"),
    DID_SOL_PROGRAM.toBuffer(),
    didAccount.toBuffer(),
    new BN(index).toArrayLike(Buffer, "le", 4)
  ],
  CRYPTID_PROGRAM
);

export const getCryptidAccountAddressFromDID = (did: string, index: number = 0): [PublicKey, number] =>
  getCryptidAccountAddress(didToPDA(did), index);

export const createCryptidAccount = async (
  program: Program<Cryptid>,
  did: PublicKey,
  middlewareAccount?: PublicKey,
  index: number = 0,
): Promise<[PublicKey, number]> => {
  const [cryptidAccount, cryptidBump] = getCryptidAccountAddress(did, index);

  await program.methods.create(
    middlewareAccount || null,  // anchor requires null instead of undefined
    index,
    cryptidBump
  ).accounts({
    cryptidAccount,
    didProgram: DID_SOL_PROGRAM,
    did,
    authority: program.provider.publicKey
  }).rpc({skipPreflight: true});

  return [cryptidAccount, cryptidBump]
}
