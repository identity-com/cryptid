import { useLocalStorage } from '@solana/wallet-adapter-react';
import { createContext, FC, ReactNode, useContext } from 'react';


export interface AccountIndexState {
    accountIndex: Number;
    setAccountIndex(accountIndex: number): void;
}

export const AccountIndexContext = createContext<AccountIndexState>({} as AccountIndexState);

export function useAccountIndex(): AccountIndexState {
    return useContext(AccountIndexContext);
}

export const AccountIndexProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [accountIndex, setAccountIndex] = useLocalStorage("index", 0);

    return (
        <AccountIndexContext.Provider value={{ accountIndex, setAccountIndex }}>{children}</AccountIndexContext.Provider>
    );
};