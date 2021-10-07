import React, { useEffect, useRef, useState } from 'react';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import TextField from '@material-ui/core/TextField';
import DialogForm from './DialogForm';
import { useWallet, useWalletAddressForMint } from '../utils/wallet';
import { PublicKey } from '@solana/web3.js';
import { abbreviateAddress } from '../utils/utils';
import InputAdornment from '@material-ui/core/InputAdornment';
import { useCallAsync, useSendTransaction } from '../utils/notifications';
import { showSwapAddress } from '../utils/config';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import DialogContentText from '@material-ui/core/DialogContentText';
import { useConnection, useIsProdNetwork } from '../utils/connection';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Link from '@material-ui/core/Link';
import Typography from '@material-ui/core/Typography';
import { useAsyncData } from '../utils/fetch-loop';
import CircularProgress from '@material-ui/core/CircularProgress';
import {
  TOKEN_PROGRAM_ID,
  WRAPPED_SOL_MINT,
} from '../utils/tokens/instructions';
import { parseTokenAccountData } from '../utils/tokens/data';
import { Switch } from '@material-ui/core';
import { resolveDomainName, resolveTwitterHandle } from '../utils/name-service';
import {useCryptid} from "../utils/Cryptid/cryptid";



export default function SendDialog({ open, onClose, publicKey, balanceInfo }) {
  const onSubmitRef = useRef();

  const { mint, tokenName, tokenSymbol } = balanceInfo;


  return (
    <>
      <DialogForm
        open={open}
        onClose={onClose}
        onSubmit={() => onSubmitRef.current()}
        fullWidth
      >
        <DialogTitle>
          Send {tokenName ?? abbreviateAddress(mint)}
          {tokenSymbol ? ` (${tokenSymbol})` : null}
        </DialogTitle>
        <SendSplDialog
          onClose={onClose}
          publicKey={publicKey}
          balanceInfo={balanceInfo}
          onSubmitRef={onSubmitRef}
        />
      </DialogForm>
    </>
  );
}

function SendSplDialog({ onClose, publicKey, balanceInfo, onSubmitRef }) {
  const defaultAddressHelperText =
    !balanceInfo.mint || balanceInfo.mint.equals(WRAPPED_SOL_MINT)
      ? 'Enter Solana Address'
      : 'Enter SPL token or Solana address';
  // const wallet = useWallet();
  const { selectedCryptidAccount } = useCryptid()
  const [sendTransaction, sending] = useSendTransaction();
  const [addressHelperText, setAddressHelperText] = useState(
    defaultAddressHelperText,
  );
  const [passValidation, setPassValidation] = useState();
  const [overrideDestinationCheck, setOverrideDestinationCheck] = useState(
    false,
  );
  const [shouldShowOverride, setShouldShowOverride] = useState();
  let {
    fields,
    destinationAddress,
    transferAmountString,
    validAmount,
  } = useForm(balanceInfo, addressHelperText, passValidation);
  const { decimals, mint } = balanceInfo;
  const mintString = mint && mint.toBase58();
  const [isDomainName, setIsDomainName] = useState(false);
  const [domainOwner, setDomainOwner] = useState();

  useEffect(() => {
    (async () => {
      if (destinationAddress.startsWith('@')) {
        const twitterOwner = await resolveTwitterHandle(
          selectedCryptidAccount.connection,
          destinationAddress.slice(1),
        );
        if (!twitterOwner) {
          setAddressHelperText(`This Twitter handle is not registered`);
          setPassValidation(undefined);
          setShouldShowOverride(undefined);
          return;
        }
        setIsDomainName(true);
        setDomainOwner(twitterOwner);
      }
      if (destinationAddress.endsWith('.sol')) {
        const domainOwner = await resolveDomainName(
          selectedCryptidAccount.connection,
          destinationAddress.slice(0, -4),
        );
        if (!domainOwner) {
          setAddressHelperText(`This domain name is not registered`);
          setPassValidation(undefined);
          setShouldShowOverride(undefined);
          return;
        }
        setIsDomainName(true);
        setDomainOwner(domainOwner);
      }
      if (!destinationAddress) {
        setAddressHelperText(defaultAddressHelperText);
        setPassValidation(undefined);
        setShouldShowOverride(undefined);
        return;
      }
      try {
        const destinationAccountInfo = await selectedCryptidAccount.connection.getAccountInfo(
          new PublicKey(isDomainName ? domainOwner : destinationAddress),
        );
        setShouldShowOverride(false);

        if (destinationAccountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
          const accountInfo = parseTokenAccountData(
            destinationAccountInfo.data,
          );
          if (accountInfo.mint.toBase58() === mintString) {
            setPassValidation(true);
            setAddressHelperText('Address is a valid SPL token address');
          } else {
            setPassValidation(false);
            setAddressHelperText('Destination address mint does not match');
          }
        } else {
          setPassValidation(true);
          setAddressHelperText(
            `Destination is a Solana address: ${
              isDomainName ? domainOwner : destinationAddress
            }`,
          );
        }
      } catch (e) {
        console.log(`Received error validating address ${e}`);
        setAddressHelperText(defaultAddressHelperText);
        setShouldShowOverride(true);
        setPassValidation(undefined);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationAddress, selectedCryptidAccount, mintString, isDomainName, domainOwner]);
  useEffect(() => {
    return () => {
      setOverrideDestinationCheck(false);
    };
  }, [setOverrideDestinationCheck]);
  async function makeTransaction() {
    let amount = Math.round(parseFloat(transferAmountString) * 10 ** decimals);
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }
    return selectedCryptidAccount.transferToken(
      publicKey,
      new PublicKey(isDomainName ? domainOwner : destinationAddress),
      amount,
      balanceInfo.mint,
      decimals,
      null,
      overrideDestinationCheck,
    );
  }

  const disabled = shouldShowOverride
    ? !overrideDestinationCheck || sending || !validAmount
    : sending || !validAmount;

  async function onSubmit() {
    return sendTransaction(makeTransaction(), { onSuccess: onClose });
  }
  onSubmitRef.current = onSubmit;
  return (
    <>
      <DialogContent>{fields}</DialogContent>
      <DialogActions>
        {shouldShowOverride && (
          <div
            style={{
              'align-items': 'center',
              display: 'flex',
              'text-align': 'left',
            }}
          >
            <b>This address has no funds. Are you sure it's correct?</b>
            <Switch
              checked={overrideDestinationCheck}
              onChange={(e) => setOverrideDestinationCheck(e.target.checked)}
              color="primary"
            />
          </div>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" color="primary" disabled={disabled}>
          Send
        </Button>
      </DialogActions>
    </>
  );
}

function useForm(
  balanceInfo,
  addressHelperText,
  passAddressValidation,
  overrideValidation,
) {
  const [destinationAddress, setDestinationAddress] = useState('');
  const [transferAmountString, setTransferAmountString] = useState('');
  const { amount: balanceAmount, decimals, tokenSymbol } = balanceInfo;

  const parsedAmount = parseFloat(transferAmountString) * 10 ** decimals;
  const validAmount = parsedAmount > 0 && parsedAmount <= balanceAmount;

  const fields = (
    <>
      <TextField
        label="Recipient Address"
        fullWidth
        variant="outlined"
        margin="normal"
        value={destinationAddress}
        onChange={(e) => setDestinationAddress(e.target.value.trim())}
        helperText={addressHelperText}
        id={
          !passAddressValidation && passAddressValidation !== undefined
            ? 'outlined-error-helper-text'
            : undefined
        }
        error={!passAddressValidation && passAddressValidation !== undefined}
      />
      <TextField
        label="Amount"
        fullWidth
        variant="outlined"
        margin="normal"
        type="number"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Button
                onClick={() =>
                  setTransferAmountString(
                    balanceAmountToUserAmount(balanceAmount, decimals),
                  )
                }
              >
                MAX
              </Button>
              {tokenSymbol ? tokenSymbol : null}
            </InputAdornment>
          ),
          inputProps: {
            step: Math.pow(10, -decimals),
          },
        }}
        value={transferAmountString}
        onChange={(e) => setTransferAmountString(e.target.value.trim())}
        helperText={
          <span
            onClick={() =>
              setTransferAmountString(
                balanceAmountToUserAmount(balanceAmount, decimals),
              )
            }
          >
            Max: {balanceAmountToUserAmount(balanceAmount, decimals)}
          </span>
        }
      />
    </>
  );

  return {
    fields,
    destinationAddress,
    transferAmountString,
    setDestinationAddress,
    validAmount,
  };
}

function balanceAmountToUserAmount(balanceAmount, decimals) {
  return (balanceAmount / Math.pow(10, decimals)).toFixed(decimals);
}

