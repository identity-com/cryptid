import { PublicKey, Connection } from '@solana/web3.js';

const AIRDROP_LAMPORTS = 1_000_000;
export const airdrop = async (
  connection: Connection,
  publicKey: PublicKey,
  lamports = AIRDROP_LAMPORTS
): Promise<void> => {
  let retries = 30;
  for (;;) {
    console.log(`Airdropping to ${publicKey}`);
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
