import { createContext, useContext, useState } from 'react';

const PageContext = createContext<{page: string, setPage: (s: string) => void}>({page: 'wallet', setPage: () => {}});

export const PageProvider = ({ children }) => {
  const [page, setPage] = useState('wallet');

  return (
    <PageContext.Provider value={{page, setPage}}>
      {children}
    </PageContext.Provider>
  );
};

export const usePage = () => useContext(PageContext);
