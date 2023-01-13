import { Cryptid } from "@identity.com/cryptid";
import {
  useConnection,
  useWallet,
  useAnchorWallet,
} from "@solana/wallet-adapter-react";
import {
  ConfirmOptions,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionSignature,
} from "@solana/web3.js";
import { FC, useCallback } from "react";
import { Wallet } from "../types";
import { notify } from "../utils/notifications";
const { connection } = useConnection();
const { publicKey, sendTransaction, signTransaction, signAllTransactions } =
  useWallet();
const reformWallet = {
  publicKey: publicKey!,
  signTransaction: signTransaction!,
  signAllTransactions: signAllTransactions!,
};
const BasicStatus: FC = () => {
  //const { networkConfiguration, setNetworkConfiguration } =
  //useNetworkConfiguration();

  ///console.log(networkConfiguration);
  const did = `did:sol:${publicKey.toBase58()}`;
  const cryptid = Cryptid.buildFromDID(did, reformWallet, {
    connection: connection,
  });

  return (
    <div>
      {/*<label className="cursor-pointer label">
        <a>Network</a>
        <select
          value={networkConfiguration}
          onChange={(e) => setNetworkConfiguration(e.target.value)}
          className="select max-w-xs"
        >
          <option value="mainnet-beta">main</option>
          <option value="devnet">dev</option>
          <option value="testnet">test</option>
        </select>
  </label>*/}
      <p>DID: {cryptid.did}</p>
      <p>Cryptid Account: {cryptid.details.didAccount}</p>
      <p>Middlewares: {cryptid.details.middlewares}</p>
    </div>
  );
};
