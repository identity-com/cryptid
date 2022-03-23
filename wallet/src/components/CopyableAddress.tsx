import Link from "@material-ui/core/Link";
import React, {useState} from "react";
import {PublicKey} from "@solana/web3.js";
import {useSolanaExplorerUrlSuffix} from "../utils/connection";
import {CameraIcon, ClipboardIcon, QrcodeIcon} from "@heroicons/react/outline";
import QRCode from 'qrcode.react';
import {Modal} from "./modals/modal";
import {useSnackbar} from "notistack";

const classNames = (...classes) => classes.filter(Boolean).join(' ');

type Props = { address?: PublicKey | string, label?: string, qrCode?: boolean, className?: string};
export const CopyableAddress:React.FC<Props> = ({address: address, label, qrCode, className}: Props) => {
  const [showQrcode, setShowQrcode] = useState(false);
  const addressString = "" + address;
  const title = label || addressString
  const urlSuffix = useSolanaExplorerUrlSuffix();
  const { enqueueSnackbar } = useSnackbar();

  const baseRef = `https://explorer.identity.com/address/${addressString.replace(/did:.*:/, '')}`;

  const copyLink = () => {
    navigator.clipboard.writeText(addressString).then(() => {
      enqueueSnackbar(`Copied ${addressString}`, {
        variant: 'success',
        autoHideDuration: 2500,
      });
    })
  };

  return (
    <div className="inline-flex items-center">
      <Link
        href={baseRef+ urlSuffix}
        target="_blank"
        rel="noopener"
        className={classNames("pl-3", className)}
        data-testid="linkToIdentityExplorer"
      >
        {title}
      </Link>
      <Modal
        Icon={CameraIcon}
        title=''
        suppressOKButton={true}
        suppressCancelButton={true}
        show={showQrcode}
        callbacks={{
          onOK: () => {},
          onClose: () => setShowQrcode(false)
        }}>
        <QRCode value={addressString} size={256} includeMargin />
      </Modal>
      <ClipboardIcon className="pl-1 mt-0.5 h-5 md:h-6 cursor-pointer text-gray-300 hover:text-gray-500" data-testid="clipboardIcon" aria-hidden="true" onClick={copyLink}/>
      {qrCode && <QrcodeIcon className="pl-1 mt-0.5 h-5 md:h-6 cursor-pointer text-gray-300 hover:text-gray-500" aria-hidden="true" onClick={() => setShowQrcode(true)}/>}
    </div>);
}
