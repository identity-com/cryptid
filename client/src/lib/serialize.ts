import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

export type JsonSerializedTransaction = {
  feePayer?: string;
  recentBlockhash?: string;
  instructions: {
    programId: string;
    keys: {
      key: string;
      isSigner: boolean;
      isWritable: boolean;
    }[];
    data: number[];
  }[];
};

export const jsonSerialize = (
  transaction: Transaction
): JsonSerializedTransaction => ({
  feePayer: transaction.feePayer?.toBase58(),
  recentBlockhash: transaction.recentBlockhash,
  instructions: transaction.instructions.map((instruction) => ({
    keys: instruction.keys.map((key) => ({
      key: key.pubkey.toBase58(),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    programId: instruction.programId.toBase58(),
    data: instruction.data.toJSON().data,
  })),
});

export const jsonDeserialize = (
  encoded: JsonSerializedTransaction
): Transaction => {
  const transaction = new Transaction({
    recentBlockhash: encoded.recentBlockhash,
    feePayer: encoded.feePayer ? new PublicKey(encoded.feePayer) : undefined,
  });

  encoded.instructions.forEach((instruction) => {
    const transactionInstruction = new TransactionInstruction({
      data: Buffer.from(instruction.data),
      programId: new PublicKey(instruction.programId),
      keys: instruction.keys.map((key) => ({
        pubkey: new PublicKey(key.key),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
    });

    transaction.add(transactionInstruction);
  });

  return transaction;
};
