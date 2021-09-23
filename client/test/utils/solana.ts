import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';

const AIRDROP_LAMPORTS = 20_000_000;
export const airdrop = async (
  connection: Connection,
  publicKey: PublicKey,
  lamports = AIRDROP_LAMPORTS
): Promise<void> => {
  let retries = 30;
  for (;;) {
    console.log(`Airdropping ${AIRDROP_LAMPORTS} Lamports to ${publicKey}`);
    const airdropSignature = await connection.requestAirdrop(
      publicKey,
      lamports
    );
    await connection.confirmTransaction(airdropSignature);
    const balance = await connection.getBalance(publicKey);
    console.log('Balance: ' + balance);
    if (lamports <= balance) return;
    if (--retries <= 0) break;
  }
  throw new Error(`Airdrop of ${lamports} failed`);
};

export const pubkey = (): PublicKey => Keypair.generate().publicKey;

export const createTransferTransaction = async (
  connection: Connection,
  sender: PublicKey,
  recipient: PublicKey,
  lamportsToTransfer: number
): Promise<Transaction> => {
  const { blockhash: recentBlockhash } = await connection.getRecentBlockhash();
  return new Transaction({ recentBlockhash, feePayer: sender }).add(
    SystemProgram.transfer({
      fromPubkey: sender,
      toPubkey: recipient,
      lamports: lamportsToTransfer,
    })
  );
};

export const sendAndConfirmCryptidTransaction = async (
  connection: Connection,
  tx: Transaction
): Promise<string> => {
  const txSignature = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(txSignature);
  return txSignature;
};
