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
import { useCryptidAccount } from "../contexts/CryptidAccountProvider";
const { connection } = useConnection();
const { publicKey, sendTransaction, signTransaction, signAllTransactions } =
  useWallet();
const reformWallet = {
  publicKey: publicKey!,
  signTransaction: signTransaction!,
  signAllTransactions: signAllTransactions!,
};

const prepareAccounts = async (did: string) => {
  return await Cryptid.findAll(did, {
    connection: connection,
  });
};

const BasicStatus: FC = async () => {
  //const { networkConfiguration, setNetworkConfiguration } =
  //useNetworkConfiguration();

  ///console.log(networkConfiguration);
  const did = `did:sol:${publicKey.toBase58()}`;
  const cryptid = Cryptid.buildFromDID(did, reformWallet, {
    connection: connection,
  });
  let accounts = await prepareAccounts(did);

  const { cryptidAccount, setCryptidAccount } = useCryptidAccount();

  return (
    <div>
      <label className="cursor-pointer label">
        <a>Network</a>
        <select
          value={cryptidAccount}
          onChange={(e) => setCryptidAccount(e.target.value)}
          className="select max-w-xs"
        >
          <option value="1">{accounts[0]}</option>
          <option value="2">{accounts[1] || "No additional accounts"}</option>
          <option value="3">{accounts[2] || null}</option>
        </select>
      </label>
    </div>
  );
};
