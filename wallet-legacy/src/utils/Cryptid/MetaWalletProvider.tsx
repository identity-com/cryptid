import { useConnectionConfig } from "../connection";
import { getLedgerWallet, getPhantomWallet, getSolflareWallet } from "@solana/wallet-adapter-wallets";
import React, { useMemo } from "react";
import {ConnectionProvider as SolanaConnectionProvider, WalletProvider as SolanaWalletProvider} from "@solana/wallet-adapter-react";
import { WalletProvider } from "../wallet";
import { CryptidProvider } from "./cryptid";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import AddMnemonicModal from "../../components/modals/AddMnenomicModal";
import WalletConnectModal from "../../components/modals/WalletConnectModal";

// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css');

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
      <SolanaWalletProvider wallets={wallets}>
        <WalletProvider>
          <CryptidProvider>
            <WalletModalProvider>
              <WalletConnectModal />
              {children}
            </WalletModalProvider>
          </CryptidProvider>
        </WalletProvider>
      </SolanaWalletProvider>
    </SolanaConnectionProvider>
  );
}
