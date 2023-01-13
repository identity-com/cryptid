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

export const ProposeTransaction: FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction, signAllTransactions } =
    useWallet();
  const reformWallet = {
    publicKey: publicKey!,
    signTransaction: signTransaction!,
    signAllTransactions: signAllTransactions!,
  };

  const onClick = useCallback(async () => {
    if (!publicKey) {
      notify({ type: "error", message: `Wallet not connected!` });
      console.log("error", `Send Transaction: Wallet not connected!`);
      return;
    }

    let signature: TransactionSignature = "";
    try {
      const did = `did:sol:${publicKey.toBase58()}`;
      const cryptid = Cryptid.buildFromDID(did, reformWallet, {
        connection: connection,
      });

      console.log("Cryptid account:", cryptid.address());

      const transferTransaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: Keypair.generate().publicKey,
          lamports: 1_000_000,
        })
      );

      const { proposeTransaction, proposeSigners, transactionAccount } =
        await cryptid.propose(transferTransaction);
      await cryptid.send(proposeTransaction, proposeSigners);

      const { executeTransactions, executeSigners } = await cryptid.execute(
        transactionAccount
      );
      executeTransactions.forEach(
        async (tx) => await cryptid.send(tx, executeSigners)
      );

      notify({
        type: "success",
        message: "Transaction successful!",
        txid: signature,
      });
    } catch (error: any) {
      notify({
        type: "error",
        message: `Transaction failed!`,
        description: error?.message,
        txid: signature,
      });
      return;
    }
  }, [publicKey, notify, connection, sendTransaction]);

  return (
    <div>
      <button
        className="group w-60 m-2 btn animate-pulse disabled:animate-none bg-gradient-to-r from-[#8B0000] to-[#FFCCCB] hover:from-pink-500 hover:to-yellow-500 ... "
        onClick={onClick}
        disabled={!publicKey}
      >
        <div className="hidden group-disabled:block ">Wallet not connected</div>
        <span className="block group-disabled:hidden">Propose Transaction</span>
      </button>
    </div>
  );
};
