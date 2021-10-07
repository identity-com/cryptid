import React from 'react';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogForm from './DialogForm';
import { abbreviateAddress } from '../utils/utils';
import CopyableDisplay from './CopyableDisplay';
import { useSolanaExplorerUrlSuffix } from '../utils/connection';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import Link from '@material-ui/core/Link';
import { DialogContentText, Tooltip } from '@material-ui/core';

const DISABLED_MINTS = new Set(['ABE7D8RU1eHfCJWzHYZZeymeE8k9nPPXfqge2NQYyKoL']);

export default function DepositDialog({
  open,
  onClose,
  publicKey,
  balanceInfo,
  isAssociatedToken,
}) {
  const urlSuffix = useSolanaExplorerUrlSuffix();
  const { mint, tokenName, tokenSymbol, owner } = balanceInfo;

  const displaySolAddress = publicKey.equals(owner) || isAssociatedToken;
  const depositAddressStr = displaySolAddress
    ? owner.toBase58()
    : publicKey.toBase58();
  return (
    <DialogForm open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Deposit {tokenName ?? mint.toBase58()}
        {tokenSymbol ? ` (${tokenSymbol})` : null}
      </DialogTitle>
      <DialogContent style={{ paddingTop: 16 }}>
          <>
            {!displaySolAddress && isAssociatedToken === false ? (
              <DialogContentText>
                This address can only be used to receive{' '}
                {tokenSymbol ?? abbreviateAddress(mint)}. Do not send SOL to
                this address.
                <br />
                <b style={{ color: 'red' }}>WARNING</b>: You are using a deprecated account type. Please migrate your tokens. Ideally, create a new wallet. If you send to this address from a poorly implemented wallet, you may burn tokens.
              </DialogContentText>
            ) : (
              <DialogContentText>
                This address can be used to receive{' '}
                {tokenSymbol ?? abbreviateAddress(mint)}.
              </DialogContentText>
            )}
            <CopyableDisplay
              value={depositAddressStr}
              label={'Deposit Address'}
              autoFocus
              qrCode
            />
            <DialogContentText variant="body2">
              <Link
                href={
                  `https://solscan.io/account/${depositAddressStr}` +
                  urlSuffix
                }
                target="_blank"
                rel="noopener"
              >
                View on Solscan
              </Link>
            </DialogContentText>
          </>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </DialogForm>
  );
}
