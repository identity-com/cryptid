import { useConnectionConfig } from "../connection";
import { getLedgerWallet, getPhantomWallet, getSolflareWallet } from "@solana/wallet-adapter-wallets";
import { useMemo } from "react";
import {ConnectionProvider as SolanaConnectionProvider, WalletProvider as SolanaWalletProvider} from "@solana/wallet-adapter-react";
import { WalletProvider } from "../wallet";
import { CryptidProvider } from "./cryptid";
import { WalletDialogProvider } from "@solana/wallet-adapter-material-ui";

export const MetaWalletProvider = ({ children }) => {

  const { endpoint } = useConnectionConfig()
  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking --
  // Only the wallets you configure here will be compiled into your application
  const wallets = useMemo(() => [
    getPhantomWallet(),
    // getSlopeWallet(),
    getSolflareWallet(),
    // getTorusWallet({
    //   options: { clientId: 'Get a client ID @ https://developer.tor.us' }
    // }),
    getLedgerWallet(),
  ], []);

  return (
    <SolanaConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletProvider>
          <CryptidProvider>
            <WalletDialogProvider>
              {children}
            </WalletDialogProvider>
          </CryptidProvider>
        </WalletProvider>
      </SolanaWalletProvider>
    </SolanaConnectionProvider>
  );
}
