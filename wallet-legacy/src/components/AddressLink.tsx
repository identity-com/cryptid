import Link from "@material-ui/core/Link";
import React from "react";
import {PublicKey} from "@solana/web3.js";
import {useSolanaExplorerUrlSuffix} from "../utils/connection";

type Props = { publicKey?: PublicKey };
export const AddressLink:React.FC<Props> = ({publicKey}: Props) => {
  const urlSuffix = useSolanaExplorerUrlSuffix();
  return (
    <Link
      href={
        `https://solscan.io/account/${publicKey?.toBase58()}`
        + urlSuffix
      }
      target="_blank"
      rel="noopener"
      className="pl-3"
    >
      {publicKey?.toBase58()}
    </Link>);
}
