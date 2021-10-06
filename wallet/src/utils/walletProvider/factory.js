import { LocalStorageWalletProvider } from './localStorage';
import {SolanaAdapterWalletProvider} from "./adapter";

export class WalletProviderFactory {
  static getProvider(type, args) {
    if (type === 'local') {
      return new LocalStorageWalletProvider(args);
    }

    if (type === 'adapter') {
      return new SolanaAdapterWalletProvider(args);
    }
  }
}
