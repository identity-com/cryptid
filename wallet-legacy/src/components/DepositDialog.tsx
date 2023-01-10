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
           callbacks={{onOK : () => {}, onClose}}
           show={open}
           Icon={ArrowCircleDownIcon}
           suppressOKButton={true}
           cancelText='Close'
    >
      <DialogContent style={{ paddingTop: 16 }}>
        <>
          <DialogContentText>
            Receive {tokenSymbol ?? abbreviateAddress(mint)} at:
          </DialogContentText>
          <CopyableAddress
            address={depositAddressStr}
            qrCode
          />
        </>
      </DialogContent>
    </Modal>
  );
}
