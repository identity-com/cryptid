import React, { useState, useMemo, useCallback, useEffect } from 'react';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Paper from '@material-ui/core/Paper';
import {
  refreshWalletPublicKeys,
  useBalanceInfo,
  useWallet,
  useWalletPublicKeys,
  useWalletSelector,
} from '../utils/wallet';
import { findAssociatedTokenAddress } from '../utils/tokens';
import LoadingIndicator from './LoadingIndicator';
import Collapse from '@material-ui/core/Collapse';
import {Card, CardContent, Typography} from '@material-ui/core';
import TokenInfoDialog from './TokenInfoDialog';
import FtxPayDialog from './FtxPay/FtxPayDialog';
import Link from '@material-ui/core/Link';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import { makeStyles } from '@material-ui/core/styles';
import { abbreviateAddress, useIsExtensionWidth } from '../utils/utils';
import Button from '@material-ui/core/Button';
import SendIcon from '@material-ui/icons/Send';
import ReceiveIcon from '@material-ui/icons/WorkOutline';
import AddKeyIcon from '@material-ui/icons/VpnKeyOutlined';
import AddServiceIcon from '@material-ui/icons/RoomServiceOutlined';
import AddControllerIcon from '@material-ui/icons/SupervisorAccountOutlined';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import AddIcon from '@material-ui/icons/Add';
import RefreshIcon from '@material-ui/icons/Refresh';
import IconButton from '@material-ui/core/IconButton';
import InfoIcon from '@material-ui/icons/InfoOutlined';
import Tooltip from '@material-ui/core/Tooltip';
import EditIcon from '@material-ui/icons/Edit';
import MergeType from '@material-ui/icons/MergeType';
import SortIcon from '@material-ui/icons/Sort';
import DeleteIcon from '@material-ui/icons/Delete';
import AddTokenDialog from './AddTokenDialog';
import ExportAccountDialog from './ExportAccountDialog';
import ftxPayIcon from './FtxPay/icon.png';
import SendDialog from './SendDialog';
import DepositDialog from './DepositDialog';
import {
  useIsProdNetwork,
  refreshAccountInfo,
  useSolanaExplorerUrlSuffix,
} from '../utils/connection';
import { useRegion } from '../utils/region';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { serumMarkets, priceStore } from '../utils/markets';
import { swapApiRequest } from '../utils/swap/api';
import { showSwapAddress } from '../utils/config';
import { useAsyncData } from '../utils/fetch-loop';
import { showTokenInfoDialog } from '../utils/config';
import { useConnection } from '../utils/connection';
import { shortenAddress } from '../utils/utils';
import CloseTokenAccountDialog from './CloseTokenAccountButton';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import TokenIcon from './TokenIcon';
import EditAccountNameDialog from './EditAccountNameDialog';
import MergeAccountsDialog from './MergeAccountsDialog';
import SwapButton from './SwapButton';
import DnsIcon from '@material-ui/icons/Dns';
import DomainsList from './DomainsList';
import {useCryptid} from "../utils/Cryptid/cryptid";
import { CryptidDetails } from "./Cryptid/CryptidDetails";
import BalanceListView from "./balances/BalanceListView";
import {PublicKey} from "@solana/web3.js";
import { BalanceListItemView } from './balances/BalanceListItemView2';

const SortAccounts = {
  None: 0,
  Ascending: 1,
  Descending: 2,
};

// Aggregated $USD values of all child BalanceListItems child components.
//
// Values:
// * undefined => loading.
// * null => no market exists.
// * float => done.
//
// For a given set of publicKeys, we know all the USD values have been loaded when
// all of their values in this object are not `undefined`.
const usdValues = {};

// Calculating associated token addresses is an asynchronous operation, so we cache
// the values so that we can quickly render components using them. This prevents
// flickering for the associated token fingerprint icon.
const associatedTokensCache = {};

function fairsIsLoaded(publicKeys) {
  return (
    publicKeys.filter((pk) => usdValues[pk.toString()] !== undefined).length ===
    publicKeys.length
  );
}

export default function BalancesList() {

  // Updated Crytpid Stuff (from a state POV)
  const { selectedCryptidAccount, setSelectedCryptidAccount } = useCryptid()
  const [publicKeys, setPublicKeys] = useState<PublicKey[]>([]);


  useEffect(() => {
    if (!selectedCryptidAccount || !selectedCryptidAccount.address) {
      setPublicKeys([])
    } else {
      setPublicKeys([selectedCryptidAccount.address])
    }
  },[selectedCryptidAccount])

  // End Cryptid Stuff

  // const wallet = useWallet();
  // const [publicKeys, loaded] = useWalletPublicKeys();

  const [showAddTokenDialog, setShowAddTokenDialog] = useState(false);
  const [showEditAccountNameDialog, setShowEditAccountNameDialog] = useState(
    false,
  );
  const [showMergeAccounts, setShowMergeAccounts] = useState(false);
  const [showFtxPayDialog, setShowFtxPayDialog] = useState(false);
  // const [sortAccounts, setSortAccounts] = useState(SortAccounts.None);
  const [showDomains, setShowDomains] = useState(false);
  const { accounts, setAccountName } = useWalletSelector();
  const [isCopied, setIsCopied] = useState(false);
  const isExtensionWidth = useIsExtensionWidth();
  // Dummy var to force rerenders on demand.
  const [, setForceUpdate] = useState(false);
  const region = useRegion();
  const selectedAccount = accounts.find((a) => a.isSelected);
  // const allTokensLoaded = loaded && fairsIsLoaded(publicKeys);
  // let sortedPublicKeys = publicKeys;
  // if (allTokensLoaded && sortAccounts !== SortAccounts.None) {
  //   sortedPublicKeys = [...publicKeys];
  //   sortedPublicKeys.sort((a, b) => {
  //     const aVal = usdValues[a.toString()];
  //     const bVal = usdValues[b.toString()];
  //
  //     a = aVal === undefined || aVal === null ? -1 : aVal;
  //     b = bVal === undefined || bVal === null ? -1 : bVal;
  //     if (sortAccounts === SortAccounts.Descending) {
  //       if (a < b) {
  //         return -1;
  //       } else if (a > b) {
  //         return 1;
  //       } else {
  //         return 0;
  //       }
  //     } else {
  //       if (b < a) {
  //         return -1;
  //       } else if (b > a) {
  //         return 1;
  //       } else {
  //         return 0;
  //       }
  //     }
  //   });
  // }
  const totalUsdValue = publicKeys
    .filter((pk) => usdValues[pk.toString()])
    .map((pk) => usdValues[pk.toString()])
    .reduce((a, b) => a + b, 0.0);

  // Memoized callback and component for the `BalanceListItems`.
  //
  // The `BalancesList` fetches data, e.g., fairs for tokens using React hooks
  // in each of the child `BalanceListItem` components. However, we want the
  // parent component, to aggregate all of this data together, for example,
  // to show the cumulative USD amount in the wallet.
  //
  // To achieve this, we need to pass a callback from the parent to the chlid,
  // so that the parent can collect the results of all the async network requests.
  // However, this can cause a render loop, since invoking the callback can cause
  // the parent to rerender, which causese the child to rerender, which causes
  // the callback to be invoked.
  //
  // To solve this, we memoize all the `BalanceListItem` children components.
  const setUsdValuesCallback = useCallback(
    (publicKey, usdValue) => {
      if (usdValues[publicKey.toString()] !== usdValue) {
        usdValues[publicKey.toString()] = usdValue;
        if (fairsIsLoaded(publicKeys)) {
          setForceUpdate((forceUpdate) => !forceUpdate);
        }
      }
    },
    [publicKeys],
  );
  const balanceListItemsMemo = useMemo(() => {
    return publicKeys.map((pk) => {
      return React.memo((props) => {
        return (
          <BalanceListItem
            key={pk.toString()}
            publicKey={pk}
            setUsdValue={setUsdValuesCallback}
            expandable={true}
          />
        );
      });
    });
  }, [publicKeys, setUsdValuesCallback]);

  const iconSize = isExtensionWidth ? 'small' : 'medium';

  return (
    <BalanceListView
      selectedCryptidAccount={selectedCryptidAccount}  
      setSelectedCryptidAccount={setSelectedCryptidAccount}
    >
      {balanceListItemsMemo.map(Memoized =>
        <Memoized />
      )}
    </BalanceListView>
  );
    // <Paper>
    //   <AppBar position="static" color="default" elevation={1}>
    //     <Toolbar>
    //       <CopyToClipboard
    //         text={selectedCryptidAccount && selectedCryptidAccount.did}
    //         onCopy={() => {
    //           setIsCopied(true);
    //           setTimeout(() => {
    //             setIsCopied(false);
    //           }, 1000);
    //         }}
    //       >
    //         <Tooltip
    //           title={
    //             <Typography>
    //               {isCopied ? 'Copied' : 'Copy to clipboard'}
    //             </Typography>
    //           }
    //           style={{ fontSize: '10rem' }}
    //         >
    //           <Typography
    //             variant="h6"
    //             style={{
    //               flexGrow: 1,
    //               fontSize: isExtensionWidth && '1rem',
    //               cursor: 'pointer',
    //             }}
    //             hover={true}
    //             component="h2"
    //           >
    //             {selectedAccount && selectedAccount.name}
    //             {isExtensionWidth
    //               ? ''
    //               : ` (${
    //                 selectedCryptidAccount &&
    //                   shortenAddress(selectedCryptidAccount.did)
    //                 })`}{' '}
    //             {/*{allTokensLoaded && (*/}
    //             {/*  <>({numberFormat.format(totalUsdValue.toFixed(2))})</>*/}
    //             {/*)}*/}
    //           </Typography>
    //         </Tooltip>
    //       </CopyToClipboard>
    //       {selectedAccount &&
    //         selectedAccount.name !== 'Main account' &&
    //         selectedAccount.name !== 'Hardware wallet' && (
    //           <Tooltip title="Edit Account Name" arrow>
    //             <IconButton
    //               size={iconSize}
    //               onClick={() => setShowEditAccountNameDialog(true)}
    //             >
    //               <EditIcon />
    //             </IconButton>
    //           </Tooltip>
    //         )}
    //       <Tooltip title="Deposit via FTX Pay" arrow>
    //         <IconButton
    //           size={iconSize}
    //           onClick={() => setShowFtxPayDialog(true)}
    //         >
    //           <img
    //             title={'FTX Pay'}
    //             alt={'FTX Pay'}
    //             style={{
    //               width: 20,
    //               height: 20,
    //             }}
    //             src={ftxPayIcon}
    //           />
    //         </IconButton>
    //       </Tooltip>
    //       <Tooltip title="See your domains" arrow>
    //         <IconButton size={iconSize} onClick={() => setShowDomains(true)}>
    //           <DnsIcon />
    //         </IconButton>
    //       </Tooltip>
    //       <DomainsList open={showDomains} setOpen={setShowDomains} />
    //       {region.result && !region.result.isRestricted && <SwapButton size={iconSize} />}
    //       <Tooltip title="Migrate Tokens" arrow>
    //         <IconButton
    //           size={iconSize}
    //           onClick={() => setShowMergeAccounts(true)}
    //         >
    //           <MergeType />
    //         </IconButton>
    //       </Tooltip>
    //       <Tooltip title="Add Token" arrow>
    //         <IconButton
    //           size={iconSize}
    //           onClick={() => setShowAddTokenDialog(true)}
    //         >
    //           <AddIcon />
    //         </IconButton>
    //       </Tooltip>
    //       {/*<Tooltip title="Sort Tokens" arrow>*/}
    //       {/*  <IconButton*/}
    //       {/*    size={iconSize}*/}
    //       {/*    onClick={() => {*/}
    //       {/*      switch (sortAccounts) {*/}
    //       {/*        case SortAccounts.None:*/}
    //       {/*          setSortAccounts(SortAccounts.Ascending);*/}
    //       {/*          return;*/}
    //       {/*        case SortAccounts.Ascending:*/}
    //       {/*          setSortAccounts(SortAccounts.Descending);*/}
    //       {/*          return;*/}
    //       {/*        case SortAccounts.Descending:*/}
    //       {/*          setSortAccounts(SortAccounts.None);*/}
    //       {/*          return;*/}
    //       {/*        default:*/}
    //       {/*          console.error('invalid sort type', sortAccounts);*/}
    //       {/*      }*/}
    //       {/*    }}*/}
    //       {/*  >*/}
    //       {/*    <SortIcon />*/}
    //       {/*  </IconButton>*/}
    //       {/*</Tooltip>*/}
    //       {/*<Tooltip title="Refresh" arrow>*/}
    //       {/*  <IconButton*/}
    //       {/*    size={iconSize}*/}
    //       {/*    onClick={() => {*/}
    //       {/*      refreshWalletPublicKeys(wallet);*/}
    //       {/*      publicKeys.map((publicKey) =>*/}
    //       {/*        refreshAccountInfo(wallet.connection, publicKey, true),*/}
    //       {/*      );*/}
    //       {/*    }}*/}
    //       {/*    style={{ marginRight: -12 }}*/}
    //       {/*  >*/}
    //       {/*    <RefreshIcon />*/}
    //       {/*  </IconButton>*/}
    //       {/*</Tooltip>*/}
    //     </Toolbar>
    //   </AppBar>
    //   {selectedCryptidAccount && <CryptidDetails cryptidAccount={selectedCryptidAccount} setSelectedCryptidAccount={setSelectedCryptidAccount}/>}
    //   <List disablePadding>
    //     {balanceListItemsMemo.map((Memoized) => (
    //       <Memoized />
    //     ))}
    //     {selectedCryptidAccount ? null : <LoadingIndicator />}
    //   </List>
    //   <AddTokenDialog
    //     open={showAddTokenDialog}
    //     onClose={() => setShowAddTokenDialog(false)}
    //   />
    //   <FtxPayDialog
    //     open={showFtxPayDialog}
    //     publicKeys={publicKeys}
    //     onClose={() => setShowFtxPayDialog(false)}
    //   />
    //   <EditAccountNameDialog
    //     open={showEditAccountNameDialog}
    //     onClose={() => setShowEditAccountNameDialog(false)}
    //     oldName={selectedAccount ? selectedAccount.name : ''}
    //     onEdit={(name) => {
    //       setAccountName(selectedAccount.selector, name);
    //       setShowEditAccountNameDialog(false);
    //     }}
    //   />
    //   <MergeAccountsDialog
    //     open={showMergeAccounts}
    // {/*    onClose={() => setShowMergeAccounts(false)}*/}
    // {/*  />*/}
    // {/*</Paper>*/}
}

const useStyles = makeStyles((theme) => ({
  address: {
    textOverflow: 'ellipsis',
    overflowX: 'hidden',
  },
  itemDetails: {
    marginLeft: theme.spacing(3),
    marginRight: theme.spacing(3),
    marginBottom: theme.spacing(2),
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'space-evenly',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  viewDetails: {
    '&:hover': {
      cursor: 'pointer',
    },
  },
}));

export function BalanceListItem({ publicKey, expandable, setUsdValue }) {
  const wallet = useWallet();
  const balanceInfo = useBalanceInfo(publicKey);
  const classes = useStyles();
  const connection = useConnection();
  const [open, setOpen] = useState(false);
  const isExtensionWidth = useIsExtensionWidth();
  const [, setForceUpdate] = useState(false);
  // Valid states:
  //   * undefined => loading.
  //   * null => not found.
  //   * else => price is loaded.
  const [price, setPrice] = useState<number|undefined>(undefined);
  useEffect(() => {
    if (balanceInfo) {
      if (balanceInfo.tokenSymbol) {
        const coin = balanceInfo.tokenSymbol.toUpperCase();
        // Don't fetch USD stable coins. Mark to 1 USD.
        if (coin === 'USDT' || coin === 'USDC') {
          setPrice(1);
        }
        // A Serum market exists. Fetch the price.
        else if (serumMarkets[coin]) {
          let m = serumMarkets[coin];
          priceStore
            .getPrice(connection, m.name)
            .then((price) => {
              setPrice(price);
            })
            .catch((err) => {
              console.error(err);
              setPrice(undefined);
            });
        }
        // No Serum market exists.
        else {
          setPrice(undefined);
        }
      }
      // No token symbol so don't fetch market data.
      else {
        setPrice(undefined);
      }
    }
  }, [price, balanceInfo, connection]);

  expandable = expandable === undefined ? true : expandable;

  if (!balanceInfo) {
    return <LoadingIndicator delay={0} />;
  }

  let {
    amount,
    decimals,
    mint,
    tokenName,
    tokenSymbol,
    tokenLogoUri,
  } = balanceInfo;
  tokenName = tokenName ?? abbreviateAddress(mint);
  let displayName;
  if (isExtensionWidth) {
    displayName = tokenSymbol ?? tokenName;
  } else {
    displayName = tokenName + (tokenSymbol ? ` (${tokenSymbol})` : '');
  }

  // Fetch and cache the associated token address.
  if (wallet && wallet.publicKey && mint) {
    if (
      associatedTokensCache[wallet.publicKey.toString()] === undefined ||
      associatedTokensCache[wallet.publicKey.toString()][mint.toString()] ===
        undefined
    ) {
      findAssociatedTokenAddress(wallet.publicKey, mint).then((assocTok) => {
        let walletAccounts = Object.assign(
          {},
          associatedTokensCache[wallet.publicKey.toString()],
        );
        walletAccounts[mint.toString()] = assocTok;
        associatedTokensCache[wallet.publicKey.toString()] = walletAccounts;
        if (assocTok.equals(publicKey)) {
          // Force a rerender now that we've cached the value.
          setForceUpdate((forceUpdate) => !forceUpdate);
        }
      });
    }
  }

  // undefined => not loaded.
  let isAssociatedToken = mint ? undefined : false;
  if (
    wallet &&
    wallet.publicKey &&
    mint &&
    associatedTokensCache[wallet.publicKey.toString()]
  ) {
    let acc =
      associatedTokensCache[wallet.publicKey.toString()][mint.toString()];
    if (acc) {
      if (acc.equals(publicKey)) {
        isAssociatedToken = true;
      } else {
        isAssociatedToken = false;
      }
    }
  }

  const subtitle =
    isExtensionWidth || !publicKey.equals(balanceInfo.owner) ? undefined : (
      <div style={{ display: 'flex', height: '20px', overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          DOA:  {publicKey.toBase58()}
        </div>
      </div>
    );

  const usdValue =
    price === undefined // Not yet loaded.
      ? undefined
      : price === null // Loaded and empty.
      ? null
      : ((amount / Math.pow(10, decimals)) * price).toFixed(2); // Loaded.
  if (setUsdValue && usdValue !== undefined) {
    setUsdValue(publicKey, usdValue === null ? null : parseFloat(usdValue));
  }

  return (
    <BalanceListItemView
      mint={mint}
      tokenName={tokenName}
      decimals={decimals}
      displayName={displayName}
      subtitle={subtitle}
      tokenLogoUri={tokenLogoUri}
      amount={amount}
      price={price}
      usdValue={usdValue}
      isAssociatedToken={isAssociatedToken}
      publicKey={publicKey}
      expandable={expandable}     
    />
  );
}
