import { PublicKey, Transaction } from '@solana/web3.js';

export class SolanaAdapterWalletProvider {
  public publicKey: PublicKey;
  public signTransaction: (t: Transaction) => Promise<Transaction>

  constructor(args) {
    this.publicKey = args.publicKey;
    this.signTransaction = args.signTransaction

  }

  init = async () => {
    return this;
  };

  // TODO remove this
  createSignature = (message) => {
    return '';
  };
}
