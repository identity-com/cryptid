import React from 'react';
import DialogContent from '@material-ui/core/DialogContent';
import { abbreviateAddress } from '../utils/utils';
import CopyableDisplay from './CopyableDisplay';
import { useSolanaExplorerUrlSuffix } from '../utils/connection';
import Link from '@material-ui/core/Link';
import { DialogContentText, Tooltip } from '@material-ui/core';
import { Modal } from "./modals/modal";
import { ArrowCircleDownIcon } from "@heroicons/react/outline";
import {CopyableAddress} from "./CopyableAddress";


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
  
  
  const title = `Deposit ${tokenName ?? mint.toBase58()} ${tokenSymbol ? `(${tokenSymbol})` : ''}`
  
  return (
    <Modal title={title}
           callbacks={{onOK : () => {}, onCancel: onClose}}
           show={open}
           Icon={ArrowCircleDownIcon}
           suppressOKButton={true}
           cancelText='Close'
    >
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
              Receive {tokenSymbol ?? abbreviateAddress(mint)} at:
            </DialogContentText>
          )}
          <CopyableAddress
            publicKey={depositAddressStr}
            qrCode
          />
        </>
      </DialogContent>
    </Modal>
  );
}
