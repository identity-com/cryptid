import './wdyr'
import NavigationFrame from './components/NavigationFrame';
import LoadingIndicator from './components/LoadingIndicator';
import React, {Suspense} from 'react';
import {PageProvider, usePage} from './utils/page';
import LoginPage from './pages/LoginPage';
import PopupPage from './pages/PopupPage';
import WalletPage from './pages/WalletPage';
import ConnectionsPage from './pages/ConnectionsPage';
import CssBaseline from '@material-ui/core/CssBaseline';
import {ConnectionProvider} from './utils/connection';
import {TokenRegistryProvider} from './utils/tokens/names';
import {SnackbarProvider} from 'notistack';
import {MetaWalletProvider} from './utils/Cryptid/MetaWalletProvider';
import IdentityPage from './pages/IdentityPage';
import {useUnlockedMnemonicAndSeed} from './utils/wallet-seed';
import {createMuiTheme, ThemeProvider} from '@material-ui/core';
import {red} from "@material-ui/core/colors";

const PageContents: React.FC = () => {
  const [{mnemonic}] = useUnlockedMnemonicAndSeed();
  const {page} = usePage();
  const suggestionKey = 'private-irgnore-wallet-suggestion';
  const ignoreSuggestion = window.localStorage.getItem(suggestionKey);
  if (!mnemonic) {
    return (
      <LoginPage/>
    );
  }
  if (window.opener) {
    return <PopupPage opener={window.opener}/>;
  } else {
    switch (page) {
      case 'Tokens':
        return <WalletPage/>;
      case 'Collectibles':
        return <>TODO no page</>;
      case 'Stake':
        return <>TODO no page</>;
      case 'Swap':
        return <>TODO no page</>;
      case 'Identity':
        return <IdentityPage/>;
    }
  }

  return <>TODO no page</>;
};


export default function App() {
  let appElement = (
    <NavigationFrame isSignerWindow={!!window.opener}>
      <Suspense fallback={<LoadingIndicator/>}>
        <PageContents/>
      </Suspense>
    </NavigationFrame>
  );

  const theme = React.useMemo(
    () =>
      createMuiTheme({
        palette: {
          primary: {
            ...red,
            main: red[900]
          },
        },
      }),
    [],
  );

  return (
    <Suspense fallback={<LoadingIndicator/>}>
      <ThemeProvider theme={theme}>
      <CssBaseline/>
      <ConnectionProvider>
        <TokenRegistryProvider>
          <SnackbarProvider maxSnack={5} autoHideDuration={8000}>
            <PageProvider>
              <MetaWalletProvider>
                {appElement}
              </MetaWalletProvider>
            </PageProvider>
          </SnackbarProvider>
        </TokenRegistryProvider>
      </ConnectionProvider>
      </ThemeProvider>
    </Suspense>
  );
}
