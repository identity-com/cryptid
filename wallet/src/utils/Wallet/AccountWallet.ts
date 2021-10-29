import * as bip32 from 'bip32';
import nacl from 'tweetnacl';
import { Account, Keypair, Transaction } from '@solana/web3.js';
import { derivePath } from 'ed25519-hd-key';
import { WalletInterface } from "../wallet";

export const DERIVATION_PATH = {
  deprecated: undefined,
  bip44: 'bip44',
  bip44Change: 'bip44Change',
  bip44Root: 'bip44Root', // Ledger only.
};

export function getAccountFromSeed(
  seed: Buffer,
  walletIndex: number,
  dPath: string | undefined = undefined,
  accountIndex: number = 0,
) {
  const derivedSeed = deriveSeed(seed, walletIndex, dPath, accountIndex);
  return new Account(nacl.sign.keyPair.fromSeed(derivedSeed).secretKey);
}

function deriveSeed(seed: Buffer, walletIndex: number, derivationPath: string | undefined, accountIndex: number) {
  switch (derivationPath) {
    case DERIVATION_PATH.deprecated:
      const path = `m/501'/${walletIndex}'/0/${accountIndex}`;
      return bip32.fromSeed(seed).derivePath(path).privateKey as Buffer;
    case DERIVATION_PATH.bip44:
      const path44 = `m/44'/501'/${walletIndex}'`;
      return derivePath(path44, seed.toString('hex')).key;
    case DERIVATION_PATH.bip44Change:
      const path44Change = `m/44'/501'/${walletIndex}'/0'`;
      return derivePath(path44Change, seed.toString('hex')).key;
    default:
      throw new Error(`invalid derivation path: ${derivationPath}`);
  }
}

export class AccountWallet implements WalletInterface {

  constructor(private account: Account) {
  }

  get publicKey() {
    return this.account.publicKey
  }

  signTransaction = async (transaction: Transaction) => {
    transaction.partialSign(this.account);
    return transaction;
  };

  signMessage(message: Uint8Array): Promise<Uint8Array> {
    return Promise.resolve(nacl.sign.detached(message, this.account.secretKey));
  }
}
