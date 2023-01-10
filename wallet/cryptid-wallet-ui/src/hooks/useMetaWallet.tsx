import { useWeb3React } from "@web3-react/core";
import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback } from "react";

export type WalletContext = {
  isConnected: (address: string) => boolean;
};
export const useMetaWallet = (): WalletContext => {
  const {account} = useWeb3React();
  const wallet = useWallet();

  const isConnected = useCallback((address: string) => {
    return account?.toLowerCase() === address.toLowerCase() || wallet.publicKey?.toBase58() === address;
  }, [account, wallet])

  return {
    isConnected,
  }
}
