import {
  AccountMeta,
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { Signer } from '../../../types/crypto';
import {
  createRegisterInstruction,
  DecentralizedIdentifier,
} from '@identity.com/sol-did-client';
import { DEFAULT_DID_DOCUMENT_SIZE, SOL_DID_PROGRAM_ID } from '../../constants';
import { DIDDocument } from 'did-resolver';
import { deriveCryptidAccountSigner, didToPublicKey } from '../util';
import { SignerArg } from "./directExecute";
import * as R from "ramda";
import TransactionAccount from "../accounts/TransactionAccount";
import InstructionData from "../model/InstructionData";
import TransactionAccountMeta from "../model/TransactionAccountMeta";
import { AssignableBuffer } from "../solanaBorsh";
import { isCorrectSize } from "../../util";

/**
 * Create a new empty transaction, initialised with a fee payer and a recent transaction hash
 * @param recentBlockhash The recentBlockhash to use for the new Transaction.
 * @param payer The fee payer for the transaction
 */
const makeEmptyTransaction = async (
  recentBlockhash: string | undefined,
  payer: PublicKey
) => {
  return new Transaction({ recentBlockhash, feePayer: payer });
};

/**
 * Creates and signs a transaction from an array of instructions
 */
export const createTransaction = async (
  recentBlockhash: string | undefined,
  instructions: TransactionInstruction[],
  payer: PublicKey,
  signers: Signer[]
): Promise<Transaction> => {
  let transaction = await makeEmptyTransaction(recentBlockhash, payer);

  transaction = transaction.add(...instructions);

  if (!isCorrectSize(transaction, signers.length)) {
    throw new Error('Transaction too large');
  }

  for (const signer of signers) {
    transaction = await signer.sign(transaction);
  }
  return transaction;
};

const registerInstruction = async (
  payer: PublicKey,
  authority: PublicKey,
  document?: Partial<DIDDocument>,
  size: number = DEFAULT_DID_DOCUMENT_SIZE
) =>
  createRegisterInstruction({
    payer,
    authority,
    size,
    document,
  });

export const didIsRegistered = async (
  connection: Connection,
  did: string
): Promise<boolean> => {
  const decentralizedIdentifier = DecentralizedIdentifier.parse(did);
  const pda = await decentralizedIdentifier.pdaSolanaPubkey();

  const account = await connection.getAccountInfo(pda);

  if (!account) return false;

  if (account.owner.equals(SOL_DID_PROGRAM_ID)) return true;

  throw new Error(
    `Invalid DID ${did}, the derived account ${pda} is registered to another program`
  );
};

export const registerInstructionIfNeeded = async (
  connection: Connection,
  did: string,
  payer: PublicKey,
  document?: Partial<DIDDocument>,
  size?: number
): Promise<TransactionInstruction | null> => {
  const isRegistered = await didIsRegistered(connection, did);

  if (isRegistered) return null;

  const [instruction] = await registerInstruction(
    payer,
    didToPublicKey(did),
    document,
    size
  );
  return instruction;
};

/**
 * Normalizes a `PublicKey | AccountMeta` to an `AccountMeta` where permissions are lowest if it's a `PublicKey`
 * @param key The key or meta to normalize
 */
const normalizeExtra = (key: PublicKey | AccountMeta): AccountMeta => {
  if (key instanceof PublicKey) {
    return {
      pubkey: key,
      isSigner: false,
      isWritable: false,
    };
  } else {
    return key;
  }
};


export const normalizeSigner = (signers: SignerArg[]) : [Signer, AccountMeta[]][] => signers.map((signer) => {
  if (Array.isArray(signer)) {
    return [signer[0], signer[1].map(normalizeExtra)];
  } else {
    return [signer, []];
  }
});

/**
 * Extract all "accounts" (programId and accounts) from a list of TransactionInstructions.
 * @param instructions The list of instructions ot extract accounts from
 */
export const collectAccounts = R.pipe(
  R.reduce((accu, instruction: TransactionInstruction) => {
    return [...accu, instruction.programId, ...instruction.keys.map((key) => key.pubkey)];
  }, [] as PublicKey[]),
  R.uniq
)

export const collectAccountMetas = R.pipe(
  R.reduce((accounts, instruction: TransactionInstruction) => {
    // Handle programId
    const prev = accounts.get(instruction.programId.toBase58());
    accounts.set(instruction.programId.toBase58(), {
      pubkey: instruction.programId,
      isSigner: !!prev?.isSigner,
      isWritable: !!prev?.isWritable,
    });

    // Handle keys
    instruction.keys.forEach((key) => {
      const prev = accounts.get(key.pubkey.toBase58());
      accounts.set(key.pubkey.toBase58(), {
        pubkey: key.pubkey,
        isSigner: prev?.isSigner || key.isSigner,
        isWritable: prev?.isWritable || key.isWritable,
      });
    });

    return accounts;
  }, new Map<string, AccountMeta>()),
  map => Array.from(map.values()),
)

export const findAccountIndex = (key: PublicKey, list: PublicKey[]) => R.findIndex(R.equals(key))(list);

export const mapTransactionInstructionsToAccountArray = (accounts: PublicKey[], instructions: TransactionInstruction[]) => R.map(
  (instruction: TransactionInstruction) => new InstructionData({
    program_id: findAccountIndex(instruction.programId, accounts),
    accounts: instruction.keys.map(native =>
      TransactionAccountMeta.fromIndexAndMeta(
        findAccountIndex(native.pubkey, accounts),
        native.isSigner,
        native.isWritable
      )
    ),
    data: new AssignableBuffer(instruction.data)
}))(instructions);

export const getExecutionAccounts = async (
  connection: Connection,
  cryptidAccount: PublicKey,
  transactionAccount: PublicKey,
  accountSeed: string): Promise<AccountMeta[]> => {
  const [account] = await Promise.all([
    connection.getAccountInfo(transactionAccount),
    deriveCryptidAccountSigner(cryptidAccount).then(([val]) => val),
  ]);
  if (!account) {
    throw new Error(`Unknown transaction account for seed ${accountSeed}`);
  }
  const transaction = TransactionAccount.decode(
    account.data,
    TransactionAccount
  );

  const accountMetas = transaction.accounts.map((key) => ({
    pubkey: key.toPublicKey(),
    isWritable: false,
    isSigner: false,
  }));

  transaction.transactionInstructions
    .flatMap((instruction) => instruction.accounts)
    .forEach((meta) => {
      const account = accountMetas[meta.key];
      account.isSigner = account.isSigner || meta.isSigner();
      account.isWritable = account.isSigner || meta.isWritable();
    });

  return accountMetas as AccountMeta[];
}



