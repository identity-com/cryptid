import React, { useState } from 'react';
import { useSnackbar } from 'notistack';
import { useConnection, useSolanaExplorerUrlSuffix } from './connection';
import Button from '@material-ui/core/Button';
import { confirmTransaction } from './utils';
import { TransactionSignature } from '@solana/web3.js';

type Callbacks = { onSuccess?: (sig: TransactionSignature) => void, onError?: (e: unknown) => void }
export function useSendTransaction():[(
  promise: Promise<TransactionSignature>,
  callbacks: Callbacks
) => void,
  boolean] {
  const connection = useConnection();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [sending, setSending] = useState(false);

  async function sendTransaction(
    signaturePromise: Promise<TransactionSignature>,
    { onSuccess, onError }: { onSuccess?: (sig: TransactionSignature) => void, onError?: (e: unknown) => void } = {},
  ) {
    let id = enqueueSnackbar('Sending transaction...', {
      variant: 'info',
      persist: true,
    });
    setSending(true);
    try {
      let signature = await signaturePromise;
      closeSnackbar(id);
      id = enqueueSnackbar('Confirming transaction...', {
        variant: 'info',
        persist: true,
        action: <ViewTransactionOnExplorerButton signature={signature} />,
      });
      await confirmTransaction(connection, signature);
      closeSnackbar(id);
      setSending(false);
      enqueueSnackbar('Transaction confirmed', {
        variant: 'success',
        autoHideDuration: 15000,
        action: <ViewTransactionOnExplorerButton signature={signature} />,
      });
      if (onSuccess) {
        onSuccess(signature);
      }
    } catch (e) {
      closeSnackbar(id);
      setSending(false);
      console.warn(e);
      if (e instanceof Error) {
        enqueueSnackbar(e.message, { variant: 'error' });
      }
      if (onError) {
        onError(e);
      }
    }
  }

  return [sendTransaction, sending];
}

function ViewTransactionOnExplorerButton({ signature }) {
  const urlSuffix = useSolanaExplorerUrlSuffix();
  return (
    <Button
      color="inherit"
      component="a"
      target="_blank"
      rel="noopener"
      href={`https://solscan.io/tx/${signature}` + urlSuffix}
    >
      View on Solscan
    </Button>
  );
}

export function useCallAsync<T>() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  return async function callAsync(
    promise: Promise<T>,
    {
      progressMessage = 'Submitting...',
      successMessage = 'Success',
      onSuccess,
      onError,
    }: { progressMessage?: string, successMessage?: string, onSuccess?: (t: T) => void, onError?: (e: unknown) => void} = {},
  ) {
    let id = enqueueSnackbar(progressMessage, {
      variant: 'info',
      persist: true,
    });
    try {
      let result = await promise;
      closeSnackbar(id);
      if (successMessage) {
        enqueueSnackbar(successMessage, { variant: 'success' });
      }
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (e) {
      console.warn(e);
      closeSnackbar(id);
      if (e instanceof Error) {
        enqueueSnackbar(e.message, {variant: 'error'});
      }
      if (onError) {
        onError(e);
      }
    }
  };
}
