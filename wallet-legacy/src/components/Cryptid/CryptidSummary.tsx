import { CryptidAccount } from "../../utils/Cryptid/cryptid";
import React, {useCallback, useEffect, useMemo, useState} from "react";
import {CheckCircleIcon, ExclamationCircleIcon, UserIcon, UsersIcon} from "@heroicons/react/solid";
import {Modal} from "../modals/modal";
import {Tooltip, Typography} from "@material-ui/core";
import {CopyableAddress} from "../CopyableAddress";
import {useIsProdNetwork} from "../../utils/connection";
import {useRequestAirdrop} from "../../utils/wallet";
import {PublicKey} from "@solana/web3.js";

const classNames = (...classes) => classes.filter(Boolean).join(' ');

interface CryptidDetailsInterface {
  cryptidAccount: CryptidAccount
}

const balanceFormat = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
  useGrouping: true,
});

const toSol = (balance:number) => balanceFormat.format(balance * 10e-10);

const MIN_BALANCE = 10000;  // min lamports in a signer to qualify as "funded"

const SignerBalanceControl:React.FC<{
  balance: number,
  signer: PublicKey
  refreshCallback?: () => void
}> = ({balance, signer, refreshCallback}) => {
  const isProdNetwork = useIsProdNetwork();
  const requestAirdrop = useRequestAirdrop(refreshCallback);

  const notFundedTooltip = useMemo(() =>
      'Signer is not funded.' + (isProdNetwork ? '' : ' Click to airdrop')
    , [isProdNetwork])

  return (
    <div className='pt-1'>
      {
      balance > MIN_BALANCE ?
        <Tooltip arrow title={'Signer is funded with ' + toSol(balance) + ' SOL '}><div>
          <CheckCircleIcon className="text-green-500 w-5 h-5" data-testid="greenCheckbox"/>
        </div></Tooltip>:
        <Tooltip arrow title={notFundedTooltip}><div>
          <ExclamationCircleIcon data-testid="exclamationCircleIcon" className={classNames(
            "text-yellow-500 w-5 h-5",
            isProdNetwork ? '' : 'cursor-pointer'
          )} onClick={() => isProdNetwork || requestAirdrop(signer)}/>
        </div></Tooltip>
    }
    </div>
  )
}

export const CryptidSummary = ({ cryptidAccount } : CryptidDetailsInterface) => {
  // hack to trigger refresh of the balance - not sure what the best react way to do this is
  const [refresh, setRefresh] = useState(0)
  const [signerBalance, setSignerBalance] = useState<number | undefined>();

  const triggerRefresh = useCallback(() => setRefresh(refresh + 1), [refresh, setRefresh])

  useEffect(() => {
    cryptidAccount.signerBalance().then(setSignerBalance);
  }, [setSignerBalance, cryptidAccount.activeSigningKey, refresh])

  return (<div className="flex items-center px-2 py-4 sm:px-6">
      <div className="min-w-0 flex-auto px-2 inline-flex" data-testid="walletName">
        <UserIcon className="w-8"/>
        <div className="pt-1 text-lg md:text-xl">
          { cryptidAccount.alias }
        </div>
      </div>
      <div className="min-w-0 pt-2 flex-auto px-2 text-sm md:text-lg">
        <CopyableAddress address={cryptidAccount.address} label='Account'/>
      </div>
      <div className="min-w-0 pt-2 flex-auto px-2">
        <div className="text-sm md:text-lg md:block text-gray-900 flex-1">
          <CopyableAddress address={cryptidAccount.did} label='DID'/>
        </div>
      </div>
      <div className="min-w-0 pt-2 px-2 flex-auto">
        <div className="inline-flex text-sm md:text-lg text-gray-900 items-center">
          <CopyableAddress address={cryptidAccount.activeSigningKey} label={`Signer: ${cryptidAccount.activeSigningKeyAlias}`}/>
          {
            signerBalance !== undefined && <SignerBalanceControl balance={signerBalance} signer={cryptidAccount.activeSigningKey} refreshCallback={triggerRefresh}/>
          }
        </div>
      </div>
      {cryptidAccount.isControlled &&
      <div className="min-w-0 pt-2 flex-1">
        <UsersIcon className="w-4"/>
      </div>
      }
    </div>
  )
}
