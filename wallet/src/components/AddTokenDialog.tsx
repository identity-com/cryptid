import React, { useEffect, useState } from 'react';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import TextField from '@material-ui/core/TextField';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useUpdateTokenName, usePopularTokens } from '../utils/tokens/names';
import { useAsyncData } from '../utils/fetch-loop';
import LoadingIndicator from './LoadingIndicator';
import { Accordion, AccordionDetails, AccordionSummary, makeStyles, Tab, Tabs, Typography } from '@material-ui/core';
import { useSendTransaction } from '../utils/notifications';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import { abbreviateAddress } from '../utils/utils';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import Collapse from '@material-ui/core/Collapse';
import { useSolanaExplorerUrlSuffix } from '../utils/connection';
import Link from '@material-ui/core/Link';
import CopyableDisplay from './CopyableDisplay';
import DialogForm from './DialogForm';
import { showSwapAddress } from '../utils/config';
import TokenIcon from './TokenIcon';
import {
  refreshCryptidAccountPublicKeys,
  useCryptid,
  useCryptidAccountTokenAccounts
} from "../utils/Cryptid/cryptid";
import { Modal } from "./modals/modal";
import { BalanceListItemDetails } from "./balances/BalanceListItemDetails";
import { serumMarkets } from "../utils/markets";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/solid";
import {PlusCircleIcon} from "@heroicons/react/outline";

function ExpandMoreIcon() {
  return null;
}

export default function AddTokenDialog({ open, onClose }) {
  let { selectedCryptidAccount } = useCryptid();
  let updateTokenName = useUpdateTokenName();
  const [sendTransaction, sending] = useSendTransaction();

  const [walletAccounts] = useCryptidAccountTokenAccounts();
  const popularTokens = usePopularTokens();
  const [tab, setTab] = useState(popularTokens.length ? 'popular' : 'manual');
  const [mintAddress, setMintAddress] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');

  console.log("tab", tab);
  console.log("popular", popularTokens);

  useEffect(() => {
    if (!popularTokens.length) {
      setTab('manual');
      console.log("tab2", tab);
    }
  }, [popularTokens, setTab]);

  const onSubmit = () => {
    let params;
    if (tab === 'manual') {
      params = { mintAddress, tokenName, tokenSymbol };
    }
    const addTokenPromise = addToken(params);

    if (!addTokenPromise) return;

    sendTransaction(addTokenPromise, {
      onSuccess: () => {
        selectedCryptidAccount && refreshCryptidAccountPublicKeys(selectedCryptidAccount);
        onClose();
      },
    });
  };

  function addToken({
                      mintAddress,
                      tokenName,
                      tokenSymbol,
                    }):Promise<string> | null {
    let mint = new PublicKey(mintAddress);
    updateTokenName(mint, tokenName, tokenSymbol);

    if (!selectedCryptidAccount) return null;

    return selectedCryptidAccount
      .createAssociatedTokenAccount(mint)
      .then(([, txSig]) => txSig);
  }


  const handleChange = (panel) => (event, newExpanded) => {
    // no need to handle a change if nothing has changed (avoids a rewrite and animation)
    if (panel === tab) return;
    setTab(newExpanded ? panel : false);
  };

  return (
    <Modal
      Icon={PlusCircleIcon}
      title="Add Token"
      suppressOKButton={tab === 'popular'}
      show={open}
      okText='Add'
      callbacks={{
        onOK: onSubmit,
        onCancel: onClose
      }}>
      <div className='w-full'>
          <>
            <Accordion
              expanded={tab === 'manual'}
              onChange={handleChange('manual')}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="manual-input"
                id="manual-input"
              >
                <Typography>Manual Input</Typography>
              </AccordionSummary>
              <AccordionDetails>
                  <form className="space-y-8 divide-y divide-gray-200 w-full">
                    <div className="space-y-6 sm:space-y-5">
                      <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                        <label htmlFor="mint-address" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
                          Mint Address
                        </label>
                        <div className="sm:pt-2 sm:mt-0 h-4 sm:col-span-2">
                          <input
                            type="text"
                            name="mint-address"
                            id="mint-address"
                            autoFocus
                            disabled={sending}
                            value={mintAddress}
                            onChange={(e) => setMintAddress(e.target.value)}
                            className="max-w-lg block w-full shadow-sm border-2 focus:ring-indigo-500 focus:border-indigo-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                      </div>

                      <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                        <label htmlFor="token-name" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
                          Name
                        </label>
                        <div className="sm:pt-2 sm:mt-0 h-4 sm:col-span-2">
                          <input
                            type="text"
                            name="token-name"
                            id="token-name"
                            onChange={(e) => setTokenName(e.target.value)}
                            autoFocus
                            disabled={sending}
                            value={tokenName}
                            className="max-w-lg block w-full shadow-sm border-2 focus:ring-indigo-500 focus:border-indigo-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                      </div>

                      <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                        <label htmlFor="token-symbol" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
                          Symbol
                        </label>
                        <div className="sm:pt-2 sm:mt-0 h-4 sm:col-span-2">
                          <input
                            id="token-symbol"
                            name="token-symbol"
                            type="type"
                            onChange={(e) => setTokenSymbol(e.target.value)}
                            autoFocus
                            disabled={sending}
                            value={tokenSymbol}
                            className="block max-w-lg w-full shadow-sm border-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                  </form>
              </AccordionDetails>
            </Accordion>
            {!!popularTokens.length && <Accordion
              expanded={tab === 'popular'}
              onChange={handleChange('popular')}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="popular-tokens"
                id="popular-tokens"
              >
                <Typography>Popular Tokens</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List disablePadding>
                  {popularTokens.filter(tokenInfo => tokenInfo.address).map((tokenInfo) => (
                    <TokenListItem
                      key={tokenInfo.address}
                      tokenInfo={tokenInfo}
                      existingAccount={(walletAccounts || []).find(
                        (account) =>
                          account.parsed.mint.toBase58() === tokenInfo.address,
                      )}
                      onSubmit={onSubmit}
                      disabled={sending}
                    />
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>}
            {/*<Accordion>*/}
            {/*  <AccordionSummary*/}
            {/*    expandIcon={<ExpandMoreIcon />}*/}
            {/*    aria-controls="erc20-token"*/}
            {/*    id="erc20-token"*/}
            {/*  >*/}
            {/*    <Typography>ERC20 Token</Typography>*/}
            {/*  </AccordionSummary>*/}
            {/*  <AccordionDetails>*/}
            {/*    <>*/}
            {/*      <TextField*/}
            {/*        label="ERC20 Contract Address"*/}
            {/*        fullWidth*/}
            {/*        variant="outlined"*/}
            {/*        margin="normal"*/}
            {/*        value={erc20Address}*/}
            {/*        onChange={(e) => setErc20Address(e.target.value.trim())}*/}
            {/*        autoFocus*/}
            {/*        disabled={sending}*/}
            {/*      />*/}
            {/*      {erc20Address && valid ? (*/}
            {/*        <Link*/}
            {/*          href={`https://etherscan.io/token/${erc20Address}`}*/}
            {/*          target="_blank"*/}
            {/*          rel="noopener"*/}
            {/*        >*/}
            {/*          View on Etherscan*/}
            {/*        </Link>*/}
            {/*      ) : null}*/}
            {/*    </>*/}
            {/*  </AccordionDetails>*/}
            {/*</Accordion>*/}
          </>
      </div>
    </Modal>
  );
}

function TokenListItem({ tokenInfo, onSubmit, disabled, existingAccount }) {
  const [open, setOpen] = useState(false);
  const urlSuffix = useSolanaExplorerUrlSuffix();
  const alreadyExists = !!existingAccount;

  return (
    <React.Fragment>
      <div style={{ display: 'flex' }} key={tokenInfo.name}>
        <ListItem button onClick={() => setOpen((open) => !open)}>
          <ListItemIcon>
            <TokenIcon
              url={tokenInfo.logoUri}
              tokenName={tokenInfo.name}
              mint={tokenInfo.mint}
              size={20}
            />
          </ListItemIcon>
          <ListItemText
            primary={
              <Link
                target="_blank"
                rel="noopener"
                href={
                  `https://solscan.io/account/${tokenInfo.address}` +
                  urlSuffix
                }
              >
                {tokenInfo.name ?? abbreviateAddress(tokenInfo.address)}
                {tokenInfo.symbol ? ` (${tokenInfo.symbol})` : null}
              </Link>
            }
          />
          {open ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Button
          type="submit"
          color="primary"
          disabled={disabled || alreadyExists}
          onClick={() =>
            onSubmit({
              tokenName: tokenInfo.name,
              tokenSymbol: tokenInfo.symbol,
              mintAddress: tokenInfo.address,
            })
          }
        >
          {alreadyExists ? 'Added' : 'Add'}
        </Button>
      </div>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <CopyableDisplay
          value={tokenInfo.address}
          label={`${tokenInfo.symbol} Mint Address`}
        />
      </Collapse>
    </React.Fragment>
  );
}
