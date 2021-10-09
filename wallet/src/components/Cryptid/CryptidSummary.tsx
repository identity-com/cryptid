import { CryptidAccount } from "../../utils/Cryptid/cryptid";
import React, {useEffect, useState} from "react";
import {CheckCircleIcon, ExclamationCircleIcon, UserIcon, UsersIcon} from "@heroicons/react/solid";
import {Modal} from "../modals/modal";
import {Tooltip, Typography} from "@material-ui/core";
import {CopyableAddress} from "../CopyableAddress";

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
const FUND_AMOUNT = 50000;

const fundAmountSol = toSol(FUND_AMOUNT)

const SignerBalanceControl:React.FC<{balance: number}> = ({balance}) => {
  const [fundConfirm, showFundConfirm] = useState(false);
  
  return (
    <div className='pt-1'>
      <Modal show={fundConfirm} callbacks={{
        onOK: () => {},// TODO
        onClose: () => showFundConfirm(false)
      }} title='Confirm fund signer?'>
        <Typography>Fund this signer with {fundAmountSol} SOL?</Typography>
      </Modal>
      {
      balance > MIN_BALANCE ?
        <Tooltip arrow title={'Signer is funded with ' + toSol(balance) + ' SOL '}><div>
          <CheckCircleIcon className="text-green-500 w-4 h-4"/>
        </div></Tooltip>: 
        <Tooltip arrow title='Signer is not funded'><div>
          <ExclamationCircleIcon className="text-yellow-500 w-4 h-4 cursor-pointer" onClick={() => showFundConfirm(true)}/>
        </div></Tooltip>
    }
    </div>
  )
}

export const CryptidSummary = ({ cryptidAccount } : CryptidDetailsInterface) => {
  const [signerBalance, setSignerBalance] = useState<number | undefined>();
  
  useEffect(() => {
    cryptidAccount.signerBalance().then(setSignerBalance);
  }, [setSignerBalance])
  
  return (<div className="flex items-center px-2 py-4 sm:px-6">
      <div className="min-w-0 flex-auto px-2 inline-flex">
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
        <div className="inline-flex text-sm md:text-lg text-gray-900">
          <CopyableAddress address={cryptidAccount.activeSigningKey} label={`Signer: ${cryptidAccount.activeSigningKeyAlias}`}/>
          {
            signerBalance !== undefined && <SignerBalanceControl balance={signerBalance}/>
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
