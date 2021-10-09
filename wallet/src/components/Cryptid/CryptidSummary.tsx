import { CryptidAccount } from "../../utils/Cryptid/cryptid";
import React from "react";
import {ClipboardIcon, KeyIcon, UserIcon, UsersIcon} from "@heroicons/react/outline";
import {AddressLink} from "../AddressLink";
import CopyableDisplay from "../CopyableDisplay";
import {CopyableAddress} from "../CopyableAddress";

interface CryptidDetailsInterface {
  cryptidAccount: CryptidAccount
}

export const CryptidSummary = ({ cryptidAccount } : CryptidDetailsInterface) => {
  return (<div className="flex items-center px-4 py-4 sm:px-6">
      <div className="min-w-0 flex-1 flex items-center">
        <div className="flex-shrink-0">
          <UserIcon className="w-8"/>
        </div>
        <div className="min-w-0 flex-1 px-4">
          Account: 
          <CopyableAddress publicKey={cryptidAccount.address || undefined}/>
        </div>
        <div className="min-w-0 flex-1 flex px-4 md:gap-4">
          <div className="text-sm md:block text-gray-900 flex-1">
            ID: {cryptidAccount.did}
          </div>
          <div className="flex-3">
            {cryptidAccount.isControlled && <UsersIcon className="w-4"/>}
          </div>
        </div>
      </div>
    </div>
  )
}
