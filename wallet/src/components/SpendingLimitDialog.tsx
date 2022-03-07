import React, { useEffect, useState } from 'react';
import '../index.css';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import TextField from '@mui/material/TextField';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useUpdateTokenName, usePopularTokens } from '../utils/tokens/names';
import { useAsyncData } from '../utils/fetch-loop';
import LoadingIndicator from './LoadingIndicator';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  makeStyles,
  Tab,
  Tabs,
  Typography,
} from '@material-ui/core';
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
import TokenIcon from './TokenIcon';
import {
  refreshCryptidAccountPublicKeys,
  useCryptid,
  useCryptidAccountTokenAccounts,
} from '../utils/Cryptid/cryptid';
import { Modal } from './modals/modal';
import {
  CheckCircleIcon,
  CurrencyDollarIcon,
  PlusCircleIcon,
} from '@heroicons/react/outline';
import { CopyableAddress } from './CopyableAddress';
import { DurationPicker } from 'material-duration-picker';
import { formatDuration } from 'date-fns';

function ExpandMoreIcon() {
  return null;
}

type TokenInfo = {
  mintAddress: string;
  tokenName: string;
  tokenSymbol: string;
};

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

  const [spendingLimit, setSpendingLimit] = useState('');
  const [windowStart, setWindowStart] = useState<string>('');
  const [windowEnd, setWindowEnd] = useState<string>('');

  useEffect(() => {
    console.log('Use Effect in AddTokenDialog');

    if (!popularTokens.length) {
      setTab('manual');
    }
  }, [popularTokens, setTab]);

  const onSubmit = (params?: TokenInfo) => {
    const tokenToAdd = params || { mintAddress, tokenName, tokenSymbol };
    console.log(tokenToAdd);
    const addTokenPromise = addToken(tokenToAdd);

    if (!addTokenPromise) return;

    sendTransaction(addTokenPromise, {
      onSuccess: () => {
        selectedCryptidAccount &&
          refreshCryptidAccountPublicKeys(selectedCryptidAccount);
        onClose();
      },
    });
  };

  function addToken({
    mintAddress,
    tokenName,
    tokenSymbol,
  }: TokenInfo): Promise<string> | null {
    const mint = new PublicKey(mintAddress);
    updateTokenName(mint, tokenName, tokenSymbol);

    if (!selectedCryptidAccount) return null;

    return selectedCryptidAccount
      .createAssociatedTokenAccount(mint)
      .then(([, txSig]) => txSig);
  }

  const handleChange = (panel) => (event, newExpanded) => {
    // no need to handle a change if nothing has changed (avoids a rewrite and animation)
    if (panel === tab) return;
    setTab(newExpanded ? panel : true);
  };

  return (
    <Modal
      Icon={CurrencyDollarIcon}
      title="Configure Spending Limit"
      suppressOKButton={tab === 'options'}
      show={open}
      okText="Add"
      okEnabled={
        windowStart.length > 0 &&
        windowEnd.length > 0 &&
        spendingLimit.length > 0
      }
      callbacks={{
        onOK: () => onSubmit(),
        onClose,
      }}
    >
      <div className="w-full">
        <>
          <Accordion
            expanded={tab === 'options'}
            onChange={handleChange('options')}
          >
            <AccordionDetails>
              <form
                className="space-y-8 divide-y divide-gray-200 w-full"
                style={{ minHeight: 300 }}
              >
                <div className="space-y-6 sm:space-y-5">
                  <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                    <label
                      style={{ marginTop: 'auto', marginBottom: 'auto' }}
                      htmlFor="window-start"
                      className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"
                    >
                      Window Start
                    </label>
                    <TextField
                      id="datetime-local"
                      label="Window Start Date/Time"
                      type="datetime-local"
                      value={windowStart}
                      defaultValue="2022-02-12T10:30"
                      onChange={(e) => setWindowStart(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 250 }}
                    />
                  </div>
                  <div
                    className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5"
                    style={{ minHeight: 80 }}
                  >
                    <label
                      style={{ marginTop: 'auto', marginBottom: 'auto' }}
                      htmlFor="window-duration"
                      className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"
                    >
                      Window End
                    </label>
                    <div className="sm:pt-2 sm:mt-0 h-4 sm:col-span-2">
                      <TextField
                        id="datetime-local"
                        label="Window End Date/Time"
                        type="datetime-local"
                        value={windowEnd}
                        onChange={(e) => setWindowEnd(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: 250 }}
                      />
                    </div>
                  </div>
                  <div
                    className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5"
                    style={{ height: 60 }}
                  >
                    <label
                      style={{ marginTop: 'auto', marginBottom: 'auto' }}
                      htmlFor="limit-amount"
                      className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"
                    >
                      Limit Amount
                    </label>
                    <div className="sm:pt-2 sm:mt-0 h-4 sm:col-span-2">
                      <input
                        style={{ outline: 'none', paddingLeft: 4 }}
                        id="limit-amount"
                        name="limit-amount"
                        type="type"
                        onChange={(e) => setTokenSymbol(e.target.value)}
                        autoFocus
                        disabled={sending}
                        value={tokenSymbol}
                        className="h-8 block max-w-lg w-full shadow-sm border-2 focus:ring-red-800 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </AccordionDetails>
          </Accordion>
        </>
      </div>
    </Modal>
  );
}
