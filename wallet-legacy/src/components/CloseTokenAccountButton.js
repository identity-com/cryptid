import DialogForm from './DialogForm';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import { DialogContentText } from '@material-ui/core';
import { abbreviateAddress } from '../utils/utils';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import React from 'react';
import { useSendTransaction } from '../utils/notifications';
import {refreshCryptidAccountPublicKeys, useCryptid} from "../utils/Cryptid/cryptid";

export default function CloseTokenAccountDialog({
  open,
  onClose,
  publicKey,
  balanceInfo,
}) {
  const { selectedCryptidAccount } = useCryptid();
  const [sendTransaction, sending] = useSendTransaction();
  const { mint, tokenName } = balanceInfo;

  function onSubmit() {
    sendTransaction(selectedCryptidAccount.closeTokenAccount(publicKey), {
      onSuccess: () => {
        refreshCryptidAccountPublicKeys(selectedCryptidAccount);
        onClose();
      },
    });
  }

  return (
    <DialogForm open={open} onClose={onClose} onSubmit={onSubmit}>
      <DialogTitle>
        Delete {tokenName ?? mint.toBase58()} Address{' '}
        {abbreviateAddress(publicKey)}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete your {tokenName ?? mint.toBase58()}{' '}
          address {publicKey.toBase58()}? This will permanently disable token
          transfers to this address and remove it from your wallet.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" color="secondary" disabled={sending}>
          Delete
        </Button>
      </DialogActions>
    </DialogForm>
  );
}
