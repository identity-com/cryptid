import React, { useEffect, useRef, useState } from 'react';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import DialogContent from '@material-ui/core/DialogContent';
import TextField from '@material-ui/core/TextField';
import { PublicKey } from '@solana/web3.js';
import { abbreviateAddress } from '../utils/utils';
import InputAdornment from '@material-ui/core/InputAdornment';
import { useSendTransaction } from '../utils/notifications';
import {
  TOKEN_PROGRAM_ID,
  WRAPPED_SOL_MINT,
} from '../utils/tokens/instructions';
import { parseTokenAccountData } from '../utils/tokens/data';
import {useCryptid} from "../utils/Cryptid/cryptid";
import { Modal } from "./modals/modal";
import {useConnection} from "../utils/connection";
import { Switch } from '@headlessui/react'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

const Toggle:React.FC<{title: string, description?: string, onChange: (enabled: boolean) => void, enabled: boolean}> = ({title, description, enabled, onChange}) => {
  return (
    <Switch.Group as="div" className="flex items-center justify-between">
      <span className="flex-grow flex flex-col">
        <Switch.Label as="span" className="text-sm font-medium text-gray-900" passive>
          {title}
        </Switch.Label>
        {description && <Switch.Description as="span" className="text-sm text-gray-500">
          {description}
        </Switch.Description>}
      </span>
      <Switch
        checked={enabled}
        onChange={onChange}
        className={classNames(
          enabled ? 'bg-red-600' : 'bg-gray-200',
          'relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
        )}
      >
        <span
          aria-hidden="true"
          className={classNames(
            enabled ? 'translate-x-5' : 'translate-x-0',
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200'
          )}
        />
      </Switch>
    </Switch.Group>
  )
}


export default function SendDialog({ open, onClose, publicKey, balanceInfo }) {
  const onSubmitRef = useRef<() => void>();

  const { mint, tokenName, tokenSymbol } = balanceInfo;
  const [enabled, setEnabled] = useState(false);

  return (
    <Modal
      show={open}
      okEnabled={enabled}
      callbacks={{onOK: () => onSubmitRef.current && onSubmitRef.current(), onClose}}
      title={`Send ${tokenName ?? abbreviateAddress(mint)} ${tokenSymbol ? ` (${tokenSymbol})` : null}`}>
        <SendSplDialog
          onClose={onClose}
          publicKey={publicKey}
          balanceInfo={balanceInfo}
          onSubmitRef={onSubmitRef}
          setEnabled={setEnabled}
        />
    </Modal>
  );
}

function SendSplDialog({ onClose, publicKey, balanceInfo, onSubmitRef, setEnabled }) {
  const connection = useConnection();
  const defaultAddressHelperText =
    !balanceInfo.mint || balanceInfo.mint.equals(WRAPPED_SOL_MINT)
      ? 'Enter Solana Address'
      : 'Enter SPL token or Solana address';
  const { selectedCryptidAccount } = useCryptid()
  const [sendTransaction, sending] = useSendTransaction();
  const [addressHelperText, setAddressHelperText] = useState(
    defaultAddressHelperText,
  );
  const [passValidation, setPassValidation] = useState<boolean | undefined>();
  const [overrideDestinationCheck, setOverrideDestinationCheck] = useState(
    false,
  );
  const [shouldShowOverride, setShouldShowOverride] = useState<boolean | undefined>();
  let {
    fields,
    destinationAddress,
    transferAmountString,
    validAmount,
  } = useForm(balanceInfo, addressHelperText, passValidation, false);
  const { decimals, mint } = balanceInfo;
  const mintString = mint && mint.toBase58();

  useEffect(() => {
    (async () => {
      if (!destinationAddress) {
        setAddressHelperText(defaultAddressHelperText);
        setPassValidation(undefined);
        setShouldShowOverride(undefined);
        setEnabled(false);
        return;
      }
      try {
        const destinationAccountInfo = await connection.getAccountInfo(
          new PublicKey(destinationAddress),
        );
        setShouldShowOverride(false);

        if (destinationAccountInfo?.owner.equals(TOKEN_PROGRAM_ID)) {
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
            `Destination is a Solana address: ${destinationAddress}`,
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
  }, [destinationAddress, selectedCryptidAccount, mintString]);
  useEffect(() =>
    () => {
      setOverrideDestinationCheck(false);
    }, [setOverrideDestinationCheck]);
  async function makeTransaction() {
    let amount = Math.round(parseFloat(transferAmountString) * 10 ** decimals);
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }
    return selectedCryptidAccount!.transferToken(
      publicKey,
      new PublicKey(destinationAddress),
      amount,
      balanceInfo.mint,
      decimals,
      undefined,
      overrideDestinationCheck,
    );
  }

  useEffect(() => {
    const disabled = shouldShowOverride
      ? !overrideDestinationCheck || sending || !validAmount
      : sending || !validAmount;
    setEnabled(!disabled);
  }, [shouldShowOverride, destinationAddress, validAmount, sending, overrideDestinationCheck])


  async function onSubmit() {
    if (!selectedCryptidAccount) return;
    return sendTransaction(makeTransaction(), { onSuccess: onClose });
  }
  onSubmitRef.current = onSubmit;
  return (
    <DialogContent>
        {fields}
        {shouldShowOverride && (
          <div>
            <Toggle
              enabled={overrideDestinationCheck}
              title='Send to unfunded address?'
              onChange={(enabled: boolean) => setOverrideDestinationCheck(enabled)}
            />
          </div>
        )}
    </DialogContent>
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
        data-testid="recipientAddress"
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
        data-testid="amount"
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

