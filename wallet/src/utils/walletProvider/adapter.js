export class SolanaAdapterWalletProvider {
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
