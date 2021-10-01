import { LocalStorageWalletProvider } from './localStorage';
import { LedgerWalletProvider } from './ledger';
import {SolanaAdapterWalletProvider} from "./adapter";

export class WalletProviderFactory {
  static getProvider(type, args) {
    if (type === 'local') {
      return new LocalStorageWalletProvider(args);
    }

    if (type === 'ledger') {
      return new LedgerWalletProvider(args);
    }

    if (type === 'adapter') {
      return new SolanaAdapterWalletProvider(args);
    }
  }
}
