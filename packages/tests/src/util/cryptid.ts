import {
  AccountMeta,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { DID_SOL_PREFIX, DID_SOL_PROGRAM } from "@identity.com/sol-did-client";
import {
  CHECK_PASS_MIDDLEWARE_PROGRAM,
  CHECK_RECIPIENT_MIDDLEWARE_PROGRAM,
  TIME_DELAY_MIDDLEWARE_PROGRAM,
} from "./constants";
import {
  Cryptid as Builder,
  CryptidClient,
  CryptidOptions,
  InstructionData,
  TransactionAccountMeta,
  CRYPTID_PROGRAM,
} from "@identity.com/cryptid-hh";
import BN from "bn.js";
import { Program } from "@project-serum/anchor";
import { Cryptid } from "@identity.com/cryptid-idl";
import { Wallet } from "./anchorUtils";
import { TestType } from "./did";

export const toAccountMeta = (
  publicKey: PublicKey,
  isWritable = false,
  isSigner = false
): AccountMeta => ({
  pubkey: publicKey,
  isWritable,
  isSigner,
});

// Creates a reference to an account, that is passed as part of cryptid instruction data for each account.
const toTransactionAccountMeta = (
  publicKeyIndex: number,
  isWritable = false,
  isSigner = false
): TransactionAccountMeta => ({
  key: publicKeyIndex,
  meta: (+isWritable << 1) | +isSigner,
});

// Creates transfer instruction data for embedding into a cryptid instruction.
// The from and to fields don't matter as they will be replaced
// with the accountMetas. The only thing that ends up in the data is the amount.
const transferInstructionData = (amount: number): Buffer =>
  SystemProgram.transfer({
    fromPubkey: PublicKey.default,
    lamports: amount,
    toPubkey: PublicKey.default,
  }).data;

// creates an InstructionData object to be passed as a parameter to the cryptid instruction.
// Requires the following accounts in the following positions in the instruction:
// 0: the cryptid account to transfer from
// 4: the recipient account
// 5: the system program
export const cryptidTransferInstruction = (
  amount: number
): InstructionData => ({
  programId: 5, // The System program - index 1 in remainingAccounts = 5 overall.
  accounts: [
    toTransactionAccountMeta(
      0, // Sender: the cryptid account - index 0 as passed into the instruction.
      true,
      true
    ),
    toTransactionAccountMeta(
      4, // The recipient - index 0 in remainingAccounts = 4 overall.
      true,
      false
    ),
  ],
  data: transferInstructionData(amount),
});

export const deriveCryptidAccountAddress = (
  didAccount: PublicKey,
  index = 0
): [PublicKey, number] =>
  PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("cryptid_account"),
      DID_SOL_PROGRAM.toBuffer(),
      didAccount.toBuffer(),
      new BN(index).toArrayLike(Buffer, "le", 4),
    ],
    CRYPTID_PROGRAM
  );

export const deriveCheckRecipientMiddlewareAccountAddress = (
  authority: PublicKey,
  nonce: number
): [PublicKey, number] =>
  PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("check_recipient"),
      authority.toBuffer(),
      Buffer.from([nonce]),
    ],
    CHECK_RECIPIENT_MIDDLEWARE_PROGRAM
  );

export const deriveCheckPassMiddlewareAccountAddress = (
  authority: PublicKey,
  gatekeeperNetwork: PublicKey,
  failsafe?: PublicKey,
  previousMiddlewareAccount?: PublicKey
): [PublicKey, number] => {
  const seeds = [
    anchor.utils.bytes.utf8.encode("check_pass"),
    authority.toBuffer(),
    gatekeeperNetwork.toBuffer(),
    failsafe?.toBuffer() || Buffer.alloc(32),
    previousMiddlewareAccount?.toBuffer() || Buffer.alloc(32),
  ];
  return PublicKey.findProgramAddressSync(seeds, CHECK_PASS_MIDDLEWARE_PROGRAM);
};

export const deriveTimeDelayMiddlewareAccountAddress = (
  authority: PublicKey,
  seconds: number
): [PublicKey, number] =>
  PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("time_delay"),
      authority.toBuffer(),
      new BN(seconds).toArrayLike(Buffer, "le", 8),
    ],
    TIME_DELAY_MIDDLEWARE_PROGRAM
  );

export const deriveTimeDelayTransactionStateMiddlewareAccountAddress = (
  transaction_account: PublicKey
): [PublicKey, number] =>
  PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("time_delay_creation_time"),
      transaction_account.toBuffer(),
    ],
    TIME_DELAY_MIDDLEWARE_PROGRAM
  );

export const createCryptidAccount = async (
  program: Program<Cryptid>,
  didAccount: PublicKey,
  didAccountBump: number,
  middlewareAccount?: PublicKey,
  index = 0
): Promise<[PublicKey, number]> => {
  const [cryptidAccount, cryptidBump] = deriveCryptidAccountAddress(
    didAccount,
    index
  );

  await program.methods
    .create(
      middlewareAccount || null, // anchor requires null instead of undefined
      index,
      didAccountBump
    )
    .accounts({
      cryptidAccount,
      didProgram: DID_SOL_PROGRAM,
      did: didAccount,
      authority: program.provider.publicKey,
    })
    .rpc({ skipPreflight: true });

  return [cryptidAccount, cryptidBump];
};

export const createCryptid = async (
  authority: Wallet,
  options: CryptidOptions
): Promise<CryptidClient> =>
  Builder.createFromDID(
    DID_SOL_PREFIX + ":" + authority.publicKey,
    authority,
    [],
    options
  );

export const buildCryptid = async (
  authority: Wallet,
  options: CryptidOptions
): Promise<CryptidClient> =>
  await Builder.buildFromDID(
    DID_SOL_PREFIX + ":" + authority.publicKey,
    authority,
    options
  );

export const cryptidTestCases = [
  {
    cryptidType: TestType.Generative,
    getCryptidClient: async (
      did: string,
      authority: Wallet | Keypair,
      options: CryptidOptions
    ) => Builder.buildFromDID(did, authority, options),
  },
  {
    cryptidType: TestType.Initialized,
    getCryptidClient: async (
      did: string,
      authority: Wallet | Keypair,
      options: CryptidOptions
    ) => Builder.createFromDID(did, authority, [], options),
  },
];

// use this when testing against the cryptid client
export const makeTransfer = (from: PublicKey, to: PublicKey): Transaction =>
  // A transaction that sends 1 SOL to the recipient
  new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports: LAMPORTS_PER_SOL,
    })
  );
