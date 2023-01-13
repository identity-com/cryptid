import { useLocalStorage } from "@solana/wallet-adapter-react";
import { createContext, FC, ReactNode, useContext } from "react";
import { CryptidAccountDetails, Cryptid } from "@identity.com/cryptid";
export interface CryptidAccountState {
  cryptidAccount: CryptidAccountDetails | null;
  setCryptidAccount(CryptidAccount: CryptidAccountDetails): void;
}

export const CryptidAccountContext = createContext<CryptidAccountState>(
  {} as CryptidAccountState
);

export function useCryptidAccount(): CryptidAccountState {
  return useContext(CryptidAccountContext);
}

export const CryptidAccountProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [cryptidAccount, setCryptidAccount] = useLocalStorage(
    "CryptidAccount",
    null
  );

  return (
    <CryptidAccountContext.Provider
      value={{ cryptidAccount, setCryptidAccount }}
    >
      {children}
    </CryptidAccountContext.Provider>
  );
};
