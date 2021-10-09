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

function ExpandMoreIcon() {
  return null;
}

export default function AddTokenDialog({ open, onClose }) {
  let { selectedCryptidAccount } = useCryptid();
  let updateTokenName = useUpdateTokenName();
  const [sendTransaction, sending] = useSendTransaction();

  const [walletAccounts] = useCryptidAccountTokenAccounts();
  const popularTokens = usePopularTokens();
  const [tab, setTab] = useState(!!popularTokens ? 'popular' : 'manual');
  const [mintAddress, setMintAddress] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [erc20Address, setErc20Address] = useState('');

  useEffect(() => {
    if (!popularTokens) {
      setTab('manual');
    }
  }, [popularTokens]);

  function onSubmit(params) {
    if (tab === 'manual') {
      params = { mintAddress, tokenName, tokenSymbol };
    } else if (tab === 'erc20') {
      params = { erc20Address };
    }
    const addTokenPromise = addToken(params);

    if (!addTokenPromise) return;

    sendTransaction(addTokenPromise, {
      onSuccess: () => {
        selectedCryptidAccount && refreshCryptidAccountPublicKeys(selectedCryptidAccount);
        onClose();
      },
    });
  }

  function addToken({
                      mintAddress,
                      tokenName,
                      tokenSymbol,
                      erc20Address,
                    }):Promise<string> | null {
    let mint = new PublicKey(mintAddress);
    updateTokenName(mint, tokenName, tokenSymbol);

    if (!selectedCryptidAccount) return null;

    return selectedCryptidAccount.createAssociatedTokenAccount(mint)
      .then(([, txSig]) => txSig);
  }

  let valid = true;
  if (tab === 'erc20') {
    valid = erc20Address.length === 42 && erc20Address.startsWith('0x');
  }

  const handleChange = (panel) => (event, newExpanded) => {
    setTab(newExpanded ? panel : false);
  };

  return (
    <Modal
      title="Add Token"
      suppressOKButton={true}
      show={open}
      callbacks={{
        onOK: () => {},
        onCancel: onClose
      }}>
      <div>
        {!!popularTokens && (
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
                <React.Fragment>
                  <TextField
                    label="Token Mint Address"
                    fullWidth
                    variant="outlined"
                    margin="normal"
                    value={mintAddress}
                    onChange={(e) => setMintAddress(e.target.value)}
                    autoFocus
                    disabled={sending}
                  />
                  <TextField
                    label="Token Name"
                    fullWidth
                    variant="outlined"
                    margin="normal"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    disabled={sending}
                  />
                  <TextField
                    label="Token Symbol"
                    fullWidth
                    variant="outlined"
                    margin="normal"
                    value={tokenSymbol}
                    onChange={(e) => setTokenSymbol(e.target.value)}
                    disabled={sending}
                  />
                </React.Fragment>
              </AccordionDetails>
            </Accordion>
            <Accordion
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
            </Accordion>
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
        )}
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
