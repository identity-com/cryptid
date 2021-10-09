import Link from "@material-ui/core/Link";
import React, {useState} from "react";
import {PublicKey} from "@solana/web3.js";
import {useSolanaExplorerUrlSuffix} from "../utils/connection";
import {CameraIcon, ClipboardIcon, QrcodeIcon} from "@heroicons/react/outline";
import QRCode from 'qrcode.react';
import {Modal} from "./modals/modal";

type Props = { publicKey?: PublicKey | string, label?: string, qrCode?: boolean };
export const CopyableAddress:React.FC<Props> = ({publicKey, label, qrCode}: Props) => {
  const [showQrcode, setShowQrcode] = useState(false);
  const pubKeyString = "" + publicKey;
  const title = label || pubKeyString
  const urlSuffix = useSolanaExplorerUrlSuffix();
  return (
    <div className="inline-flex">
    <Link
      href={
        `https://solscan.io/account/${pubKeyString}`
        + urlSuffix
      }
      target="_blank"
      rel="noopener"
      className="pl-3"
    >
      {title}
    </Link>
      <Modal
        Icon={CameraIcon}
        title=''
        suppressOKButton={true}
        show={showQrcode} 
        callbacks={{
        onOK: () => {},
        onCancel: () => setShowQrcode(false)
      }}>
          <QRCode value={pubKeyString} size={256} includeMargin />
      </Modal>
      <ClipboardIcon className="inline-flex pl-1 h-5 mb-3" aria-hidden="true"/>
      {qrCode && <QrcodeIcon className="inline-flex pl-1 h-5 mb-3" aria-hidden="true" onClick={() => setShowQrcode(true)}/>}
    </div>);
}
