import { createContext, useContext, useState } from 'react';
import {Page} from "./config";

const PageContext = createContext<{page: Page, setPage: (s: Page) => void}>({page: 'Tokens', setPage: () => {}});

export const PageProvider = ({ children }) => {
  const [page, setPage] = useState<Page>('Tokens');

  return (
    <PageContext.Provider value={{page, setPage}}>
      {children}
    </PageContext.Provider>
  );
};

export const usePage = () => useContext(PageContext);
