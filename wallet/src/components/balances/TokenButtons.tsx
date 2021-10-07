/* This example requires Tailwind CSS v2.0+ */
import {PaperAirplaneIcon, CubeTransparentIcon, PlusCircleIcon, RefreshIcon} from '@heroicons/react/solid'
import * as React from "react";
import {refreshAccountInfo, useConnection, useConnectionConfig, useIsProdNetwork} from "../../utils/connection";
import { TokenButton } from './TokenButton';
import { Keypair, LAMPORTS_PER_SOL, PublicKey} from "@solana/web3.js";
import {abbreviateAddress, sleep} from "../../utils/utils";
import {createAndInitializeMint} from "../../utils/tokens";
import {refreshWalletPublicKeys, useBalanceInfo} from "../../utils/wallet";
import {useCryptid} from "../../utils/Cryptid/cryptid";
import {useUpdateTokenName} from "../../utils/tokens/names";
import {useCallAsync, useSendTransaction} from "../../utils/notifications";

export default function TokenButtons() {
  const isProdNetwork = useIsProdNetwork();
  const connection = useConnection();

  const { selectedCryptidAccount } = useCryptid()
  const balanceInfo = useBalanceInfo(selectedCryptidAccount?.address);

  const updateTokenName = useUpdateTokenName();
  const { endpoint } = useConnectionConfig();
  const [sendTransaction, sending] = useSendTransaction();
  const callAsync = useCallAsync();

  if (!selectedCryptidAccount || !selectedCryptidAccount.address) return <></>;

  const requestAirdrop = (...addresses: PublicKey[]) => {
    addresses.forEach(address => {
      callAsync(
        connection.requestAirdrop(address, LAMPORTS_PER_SOL),
        {
          onSuccess: async () => {
            await sleep(5000);
            refreshAccountInfo(connection, address);
          },
          successMessage:
            'Success! Please wait up to 30 seconds for the SOL tokens to appear in your wallet.',
        },
      );
    })
  };

  const mintTestToken = (owner: PublicKey) => {
    const mint = Keypair.generate();
    updateTokenName(
      mint.publicKey,
      `Test Token ${abbreviateAddress(mint.publicKey)}`,
      `TEST${mint.publicKey.toBase58().slice(0, 2)}`,
    );
    sendTransaction(
      createAndInitializeMint({
        connection: connection,
        owner: {
          publicKey: owner,
          signTransaction: selectedCryptidAccount.signTransaction
        },
        mint,
        amount: 1000,
        decimals: 2,
        initialAccount: Keypair.generate(),
      }),
      { onSuccess: () => refreshWalletPublicKeys(selectedCryptidAccount) },
    );
  };

  return (
    <div className="z-0 inline-flex shadow-sm rounded-md min-w-full justify-end ">
      <TokenButton label="Add Token" Icon={PlusCircleIcon} additionalClasses='rounded-l-md'
                   onClick={() => {}}
      />
      {isProdNetwork || <TokenButton label="Request Airdrop" Icon={PaperAirplaneIcon}
                                     onClick={() => requestAirdrop(selectedCryptidAccount.address as PublicKey, selectedCryptidAccount.activeSigningKey())}/>}
      {isProdNetwork || <TokenButton label="Mint Test Token" Icon={CubeTransparentIcon}
                                     onClick={() => mintTestToken(selectedCryptidAccount.address as PublicKey)}/>}
      <TokenButton label="Refresh" Icon={RefreshIcon} additionalClasses='rounded-r-md'
                   onClick={() => {}}/>
    </div>
  )
}
