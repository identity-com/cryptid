import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {SOL_DID_PROGRAM_ID} from "../../src/lib/constants";

const AIRDROP_LAMPORTS = 20_000_000;
export const airdrop = async (
  connection: Connection,
  publicKey: PublicKey,
  lamports = AIRDROP_LAMPORTS
): Promise<void> => {
  let retries = 30;
  for (;;) {
    console.log(`Airdropping ${lamports} Lamports to ${publicKey}`);
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

export const connection = () => new Connection('http://whatever.test')

export const dummyDIDAccountInfo = {
  data: Buffer.from([]),
  executable: false,
  lamports: 0,
  owner: SOL_DID_PROGRAM_ID
};

class Balance {
  private balanceBefore = 0;
  private balanceAfter = 0;

  constructor(readonly address: PublicKey, private connection: Connection) {}
  async registerBefore(): Promise<void> {
    this.balanceBefore = await this.connection.getBalance(this.address);
  }

  async registerAfter(): Promise<void> {
    this.balanceAfter = await this.connection.getBalance(this.address);
  }

  difference(): number {
    return this.balanceAfter - this.balanceBefore;
  }
}

export class Balances {
  private balances: Balance[];

  constructor(private connection: Connection) {
    this.balances = [];
  }

  async register(...address: PublicKey[]): Promise<Balances> {
    this.balances.push(
      ...address.map((address) => new Balance(address, this.connection))
    );

    await this.recordBefore();
    return this;
  }

  async recordBefore(): Promise<void> {
    await Promise.all(this.balances.map((b) => b.registerBefore()));
  }

  async recordAfter(): Promise<void> {
    await Promise.all(this.balances.map((b) => b.registerAfter()));
  }

  for(address: PublicKey): number | undefined {
    return this.balances.find((b) => b.address.equals(address))?.difference();
  }
}
