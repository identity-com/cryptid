import { Keypair, PublicKey, TransactionSignature } from '@solana/web3.js';

export interface SpendingLimit {
  pubKey: PublicKey;
  /**
   * Creates a new spending limit
   * @param keyPair the keypair where the account will be created
   * @param windowStart the window offset
   * @param windowDuration the window duration
   * @param spendingLimit amount of SOL the user is able to spend in Lamports
   */

  /**
   * Closes the spending limit (must be removed from Cryptid account)
   * @param authority controlling the spending limit
   */
  close(authority: Keypair): Promise<TransactionSignature>;

  removeFromCryptidAccount(
    authority: Keypair,
    cryptidAccount: PublicKey
  ): Promise<TransactionSignature>;

  /**
   * Updates the spending limit on an account
   * @param args
   * @param authority
   */
  update(
    args: {
      windowStart?: Date;
      windowDuration?: number;
      spendingLimit?: number;
      newAuthority?: PublicKey;
    },
    authority: Keypair
  ): Promise<TransactionSignature>;

  /**
   * Updates the spent SOL value
   * @param authority the authority for the spending limit
   * @param spentValue the amount of SOL spent in Lamports
   */
  setSpent(
    authority: Keypair,
    spentValue: number
  ): Promise<TransactionSignature>;
}

export async function createSpendingLimit(
  keyPair: Keypair,
  windowStart: Date,
  windowDuration: number,
  spendingLimit: number,
  authority: PublicKey
): Promise<{ sig: TransactionSignature; spendingLimit: SpendingLimit }> {
  const sig = '';
  console.log(windowStart, windowDuration, spendingLimit, authority);
  return {
    sig,
    spendingLimit: {
      pubKey: keyPair.publicKey,
      async close(authority: Keypair) {
        console.log(authority);
        return sig;
      },
      async removeFromCryptidAccount(
        authority: Keypair,
        cryptidAccount: PublicKey
      ) {
        console.log(authority, cryptidAccount);
        return sig;
      },
      async update(
        args: {
          windowStart?: Date;
          windowDuration?: number;
          spendingLimit?: number;
          newAuthority?: PublicKey;
        },
        authority: Keypair
      ) {
        console.log(args, authority);
        return sig;
      },
      async setSpent(authority: Keypair, spentValue: number) {
        console.log(authority, spentValue);
        return sig;
      },
    },
  };
}
