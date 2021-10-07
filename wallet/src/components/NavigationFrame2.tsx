import React, {useState, useMemo, Fragment} from 'react';
import { useConnectionConfig } from '../utils/connection';
import {CLUSTERS, clusterForEndpoint, getClusters, addCustomCluster, customClusterExists} from '../utils/clusters';
import { useWalletSelector } from '../utils/wallet';
import SolanaIcon from './SolanaIcon';
import AddAccountDialog from './AddAccountDialog';
import DeleteMnemonicDialog from './DeleteMnemonicDialog';
import { ExportMnemonicDialog } from './ExportAccountDialog.js';
import ConnectionIcon from './ConnectionIcon';
import { useConnectedWallets } from '../utils/connected-wallets';
import { usePage } from '../utils/page';
import AddCustomClusterDialog from "./AddCustomClusterDialog";
import {CryptidSelector} from "./Cryptid/CryptidSelector";
import {
  WalletDisconnectButton,
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';
import {BellIcon, CogIcon, MenuIcon, UserIcon, XIcon} from "@heroicons/react/outline";
import {Menu, Disclosure, Transition} from "@headlessui/react";
import {complement} from "ramda";
import MenuItem from "@material-ui/core/MenuItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import CheckIcon from "@material-ui/icons/Check";
import {pages} from "../utils/config";

type DIDElement = { alias: string, did: string, controlledBy?: string }
const userNavigation: DIDElement[] = [
  { alias: 'Dan', did: 'did:sol:dan' },
  { alias: 'James', did: 'did:sol:james' },
  { alias: 'Civic', did: 'did:sol:civic', controlledBy: 'did:sol:dan' },
]

const selectedDIDElement = userNavigation[0];

const classNames = (...classes) => classes.filter(Boolean).join(' ');

type DIDMenuItemProps = { item: DIDElement }
const DIDMenuItem = ({item}: DIDMenuItemProps) => (
  <Menu.Item key={item.alias || item.did}>
    {({ active }) => (
      <a
        href={item.did}
        className={classNames(
          active ? 'bg-gray-100' : '',
          'block px-4 py-2 text-sm text-gray-700'
        )}
      >
        {item.alias}
      </a>
    )}
  </Menu.Item>
)

const isControlledBy = (didElement: DIDElement) => !!didElement.controlledBy;

const IdentitySelector = () => (
  <div className="hidden sm:ml-2 sm:flex sm:items-center">
    {/* Identity dropdown */}
    <Menu as="div" className="ml-3 relative">
      <div>
        <Menu.Button className="max-w-xs bg-white text-gray-400 flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <span className="sr-only">Select Identity</span>
          {/*<UserIcon className="h-6 w-6" aria-hidden="true"/>*/}
          <span className="inline-block h-12 w-12 rounded-full overflow-hidden bg-gray-100">
        <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </span>
        </Menu.Button>
      </div>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
          {userNavigation.filter(complement(isControlledBy)).map((item) =>
            <DIDMenuItem item={item}/>
          )}
          <hr/>
          {userNavigation.filter(isControlledBy).map((item, index) =>
            <DIDMenuItem item={item}/>
          )}
        </Menu.Items>
      </Transition>
    </Menu>
  </div>
)

const NetworkSelector = () => {
  const { endpoint, setEndpoint } = useConnectionConfig();
  const cluster = useMemo(() => clusterForEndpoint(endpoint), [endpoint]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [addCustomNetworkOpen, setCustomNetworkOpen] = useState(false);

  return (
    <div className="hidden sm:ml-6 sm:flex sm:items-center">
      <AddCustomClusterDialog
        open={addCustomNetworkOpen}
        onClose={() => setCustomNetworkOpen(false)}
        onAdd={({ name, apiUrl }) => {
          addCustomCluster(name, apiUrl);
          setCustomNetworkOpen(false);
        }}
      />
      <Menu as="div" className="ml-3 relative">
        <div>
          <Menu.Button
            className="max-w-xs bg-white text-gray-400 flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <span className="sr-only">Select Network</span>
            <CogIcon className="h-6 w-6" aria-hidden="true"/>
          </Menu.Button>
        </div>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items
            className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
            {getClusters().map((cluster) => (
              <Menu.Item key={cluster.apiUrl}>
                {({ active }) => (
                  /*{ cluster.apiUrl === endpoint && <CheckIcon className="px-4 py-2" /> }*/
                  <a
                    className={classNames(
                      cluster.apiUrl === endpoint ? 'bg-gray-200' : '',
                      active ? 'bg-gray-100' : '',
                      'block px-2 py-2 text-sm text-gray-700'
                    )}
                    onClick={() => {
                      setAnchorEl(null);
                      setEndpoint(cluster.apiUrl);
                    }}
                  >
                    {cluster.name === 'mainnet-beta-backup'
                      ? 'Mainnet Beta Backup'
                      : (cluster.name || cluster.apiUrl)}
                  </a>
                )}
              </Menu.Item>
            ))}
            <Menu.Item
              onClick={() => {
                setCustomNetworkOpen(true);
              }}
            >
              <a
                className="block px-2 py-2 text-sm text-gray-700"
                onClick={() => {
                  setCustomNetworkOpen(true);
                }}>{customClusterExists() ? 'Edit Custom Endpoint' : 'Add Custom Endpoint'}
              </a>
            </Menu.Item>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
}

function NavigationPanel() {
  const { page, setPage } = usePage()

  return (
    <Disclosure as="nav" className="bg-white border-b border-gray-200">
      {({ open }) => (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-32">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <img
                    className="block h-32 w-auto"
                    src="logo300.png"
                    alt="Cryptid squid"
                  />
                  <img
                    className="block h-8 w-auto"
                    src="title.webp"
                    alt="Cryptid"
                  />
                </div>
                <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                  {pages.map((item) => (
                    <a
                      href='#'
                      key={item}
                      onClick={() => setPage(item)}
                      className={classNames(
                        item === page
                          ? 'border-indigo-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                        'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium'
                      )}
                      aria-current={item === page ? 'page' : undefined}
                    >
                      {item}
                    </a>
                  ))}
                </div>
              </div>
              <div className="sm:ml-6 sm:flex">
                <NetworkSelector/>
                <IdentitySelector/>
              </div>
              <div className="-mr-2 flex items-center sm:hidden">
                {/* Mobile menu button */}
                <Disclosure.Button
                  className="bg-white inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XIcon className="block h-6 w-6" aria-hidden="true"/>
                  ) : (
                    <MenuIcon className="block h-6 w-6" aria-hidden="true"/>
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {pages.map((item) => (
                <a
                  key={item}
                  className={classNames(
                    item === page
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800',
                    'block pl-3 pr-4 py-2 border-l-4 text-base font-medium'
                  )}
                  aria-current={item === page? 'page' : undefined}
                >
                  {item}
                </a>
              ))}
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <img className="h-10 w-10 rounded-full" src={selectedDIDElement.did} alt=""/>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{selectedDIDElement.alias}</div>
                  <div className="text-sm font-medium text-gray-500">{selectedDIDElement.did}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {userNavigation.map((item) => (
                  <a
                    key={item.alias}
                    href={item.did}
                    className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  >
                    {item.alias}
                  </a>
                ))}
              </div>
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  )
}

export default function NavigationFrame({ children }) {
  return (
    <div className="min-h-screen bg-white">
      <NavigationPanel/>
      {children}
    </div>
  )
}

// function NavigationButtons() {
//   const isExtensionWidth = useIsExtensionWidth();
//   const [page] = usePage();
//
//   if (isExtensionPopup) {
//     return null;
//   }
//
//   let elements = [];
//   if (page === 'wallet') {
//     elements = [
//       <CryptidSelector />,
//       <WalletSelector />,
//       <WalletMultiButton />,
//       <WalletDisconnectButton />,
//       <NetworkSelector />,
//     ];
//   } else if (page === 'connections') {
//     elements = [<WalletButton />];
//   }
//
//
//   return elements;
// }

// function ExpandButton() {
//   const onClick = () => {
//     window.open(chrome.extension.getURL('index.html'), '_blank');
//   };
//
//   return (
//     <Tooltip title="Expand View">
//       <IconButton color="inherit" onClick={onClick}>
//         <OpenInNew />
//       </IconButton>
//     </Tooltip>
//   );
// }

// function WalletButton() {
//   const classes = useStyles();
//   const setPage = usePage()[1];
//   const onClick = () => setPage('wallet');
//
//   return (
//     <>
//       <Hidden smUp>
//         <Tooltip title="Wallet Balances">
//           <IconButton color="inherit" onClick={onClick}>
//             <MonetizationOn />
//           </IconButton>
//         </Tooltip>
//       </Hidden>
//       <Hidden xsDown>
//         <Button color="inherit" onClick={onClick} className={classes.button}>
//           Wallet
//         </Button>
//       </Hidden>
//     </>
//   );
// }

// function ConnectionsButton() {
//   const classes = useStyles();
//   const setPage = usePage()[1];
//   const onClick = () => setPage('connections');
//   const connectedWallets = useConnectedWallets();
//
//   const connectionAmount = Object.keys(connectedWallets).length;
//
//   return (
//     <>
//       <Hidden smUp>
//         <Tooltip title="Manage Connections">
//           <IconButton color="inherit" onClick={onClick}>
//             <Badge
//               badgeContent={connectionAmount}
//               classes={{ badge: classes.badge }}
//             >
//               <ConnectionIcon />
//             </Badge>
//           </IconButton>
//         </Tooltip>
//       </Hidden>
//       <Hidden xsDown>
//         <Badge
//           badgeContent={connectionAmount}
//           classes={{ badge: classes.badge }}
//         >
//           <Button color="inherit" onClick={onClick} className={classes.button}>
//             Connections
//           </Button>
//         </Badge>
//       </Hidden>
//     </>
//   );
// }

// function NetworkSelector() {
//   const { endpoint, setEndpoint } = useConnectionConfig();
//   const cluster = useMemo(() => clusterForEndpoint(endpoint), [endpoint]);
//   const [anchorEl, setAnchorEl] = useState(null);
//   const [addCustomNetworkOpen, setCustomNetworkOpen] = useState(false);
//   const classes = useStyles();
//
//   return (
//     <>
//       <AddCustomClusterDialog
//         open={addCustomNetworkOpen}
//         onClose={() => setCustomNetworkOpen(false)}
//         onAdd={({ name, apiUrl }) => {
//           addCustomCluster(name, apiUrl);
//           setCustomNetworkOpen(false);
//         }}
//       />
//       <Hidden xsDown>
//         <Button
//           color="inherit"
//           onClick={(e) => setAnchorEl(e.target)}
//           className={classes.button}
//         >
//           {cluster?.label ?? 'Network'}
//         </Button>
//       </Hidden>
//       <Hidden smUp>
//         <Tooltip title="Select Network" arrow>
//           <IconButton color="inherit" onClick={(e) => setAnchorEl(e.target)}>
//             <SolanaIcon />
//           </IconButton>
//         </Tooltip>
//       </Hidden>
//       <Menu
//         anchorEl={anchorEl}
//         open={!!anchorEl}
//         onClose={() => setAnchorEl(null)}
//         anchorOrigin={{
//           vertical: 'bottom',
//           horizontal: 'right',
//         }}
//         getContentAnchorEl={null}
//       >
//         {getClusters().map((cluster) => (
//           <MenuItem
//             key={cluster.apiUrl}
//             onClick={() => {
//               setAnchorEl(null);
//               setEndpoint(cluster.apiUrl);
//             }}
//             selected={cluster.apiUrl === endpoint}
//           >
//             <ListItemIcon className={classes.menuItemIcon}>
//               {cluster.apiUrl === endpoint ? (
//                 <CheckIcon fontSize="small" />
//               ) : null}
//             </ListItemIcon>
//             {cluster.name === 'mainnet-beta-backup'
//               ? 'Mainnet Beta Backup'
//               : cluster.apiUrl}
//           </MenuItem>
//         ))}
//         <MenuItem
//           onClick={() => {
//             setCustomNetworkOpen(true);
//           }}
//         >
//           <ListItemIcon className={classes.menuItemIcon}>
//           </ListItemIcon>
//           {customClusterExists() ? 'Edit Custom Endpoint' : 'Add Custom Endpoint'}
//         </MenuItem>
//       </Menu>
//     </>
//   );
// }

// function WalletSelector() {
//   const {
//     accounts,
//     derivedAccounts,
//     hardwareWalletAccount,
//     setHardwareWalletAccount,
//     setWalletSelector,
//     addAccount,
//   } = useWalletSelector();
//   const [anchorEl, setAnchorEl] = useState(null);
//   const [addAccountOpen, setAddAccountOpen] = useState(false);
//   const [
//     addHardwareWalletDialogOpen,
//     setAddHardwareWalletDialogOpen,
//   ] = useState(false);
//   const [deleteMnemonicOpen, setDeleteMnemonicOpen] = useState(false);
//   const [exportMnemonicOpen, setExportMnemonicOpen] = useState(false);
//   const classes = useStyles();
//
//   if (accounts.length === 0) {
//     return null;
//   }
//   return (
//     <>
//       <AddHardwareWalletDialog
//         open={addHardwareWalletDialogOpen}
//         onClose={() => setAddHardwareWalletDialogOpen(false)}
//         onAdd={({ publicKey, derivationPath, account, change }) => {
//           setHardwareWalletAccount({
//             name: 'Hardware wallet',
//             publicKey,
//             importedAccount: publicKey.toString(),
//             ledger: true,
//             derivationPath,
//             account,
//             change,
//           });
//           setWalletSelector({
//             walletIndex: undefined,
//             importedPubkey: publicKey.toString(),
//             ledger: true,
//             derivationPath,
//             account,
//             change,
//           });
//         }}
//       />
//       <AddAccountDialog
//         open={addAccountOpen}
//         onClose={() => setAddAccountOpen(false)}
//         onAdd={({ name, importedAccount }) => {
//           addAccount({ name, importedAccount });
//           setWalletSelector({
//             walletIndex: importedAccount ? undefined : derivedAccounts.length,
//             importedPubkey: importedAccount
//               ? importedAccount.publicKey.toString()
//               : undefined,
//             ledger: false,
//           });
//           setAddAccountOpen(false);
//         }}
//       />
//       <ExportMnemonicDialog
//         open={exportMnemonicOpen}
//         onClose={() => setExportMnemonicOpen(false)}
//       />
//       <DeleteMnemonicDialog
//         open={deleteMnemonicOpen}
//         onClose={() => setDeleteMnemonicOpen(false)}
//       />
//       <Hidden xsDown>
//         <Button
//           color="inherit"
//           onClick={(e) => setAnchorEl(e.target)}
//           className={classes.button}
//         >
//           Account
//         </Button>
//       </Hidden>
//       <Hidden smUp>
//         <Tooltip title="Select Account" arrow>
//           <IconButton color="inherit" onClick={(e) => setAnchorEl(e.target)}>
//             <AccountIcon />
//           </IconButton>
//         </Tooltip>
//       </Hidden>
//       <Menu
//         anchorEl={anchorEl}
//         open={!!anchorEl}
//         onClose={() => setAnchorEl(null)}
//         anchorOrigin={{
//           vertical: 'bottom',
//           horizontal: 'right',
//         }}
//         getContentAnchorEl={null}
//       >
//         {accounts.map((account) => (
//           <AccountListItem
//             account={account}
//             classes={classes}
//             setAnchorEl={setAnchorEl}
//             setWalletSelector={setWalletSelector}
//           />
//         ))}
//         {hardwareWalletAccount && (
//           <>
//             <Divider />
//             <AccountListItem
//               account={hardwareWalletAccount}
//               classes={classes}
//               setAnchorEl={setAnchorEl}
//               setWalletSelector={setWalletSelector}
//             />
//           </>
//         )}
//         <Divider />
//         <MenuItem onClick={() => setAddHardwareWalletDialogOpen(true)}>
//           <ListItemIcon className={classes.menuItemIcon}>
//             <UsbIcon fontSize="small" />
//           </ListItemIcon>
//           Import Hardware Wallet
//         </MenuItem>
//         <MenuItem
//           onClick={() => {
//             setAnchorEl(null);
//             setAddAccountOpen(true);
//           }}
//         >
//           <ListItemIcon className={classes.menuItemIcon}>
//             <AddIcon fontSize="small" />
//           </ListItemIcon>
//           Add Account
//         </MenuItem>
//         <MenuItem
//           onClick={() => {
//             setAnchorEl(null);
//             setExportMnemonicOpen(true);
//           }}
//         >
//           <ListItemIcon className={classes.menuItemIcon}>
//             <ImportExportIcon fontSize="small" />
//           </ListItemIcon>
//           Export Mnemonic
//         </MenuItem>
//         <MenuItem
//           onClick={() => {
//             setAnchorEl(null);
//             setDeleteMnemonicOpen(true);
//           }}
//         >
//           <ListItemIcon className={classes.menuItemIcon}>
//             <ExitToApp fontSize="small" />
//           </ListItemIcon>
//           {'Delete Mnemonic & Log Out'}
//         </MenuItem>
//       </Menu>
//     </>
//   );
// }

//
//
// function AccountListItem({ account, classes, setAnchorEl, setWalletSelector }) {
//   return (
//     <MenuItem
//       key={account.address.toBase58()}
//       onClick={() => {
//         setAnchorEl(null);
//         setWalletSelector(account.selector);
//       }}
//       selected={account.isSelected}
//       component="div"
//     >
//       <ListItemIcon className={classes.menuItemIcon}>
//         {account.isSelected ? <CheckIcon fontSize="small" /> : null}
//       </ListItemIcon>
//       <div style={{ display: 'flex', flexDirection: 'column' }}>
//         <Typography>{account.name}</Typography>
//         <Typography color="textSecondary">
//           {account.address.toBase58()}
//         </Typography>
//       </div>
//     </MenuItem>
//   );
// }
