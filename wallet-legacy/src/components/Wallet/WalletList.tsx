import React, { useState } from "react";
import { ExtendedPersistedWalletType, useRequestAirdrop, WalletTypeString } from "../../utils/wallet";
import WalletAvatar from "./WalletAvatar";
import { CheckCircleIcon, MinusCircleIcon, PlusCircleIcon, XCircleIcon } from "@heroicons/react/outline";
import { PublicKey } from "@solana/web3.js";
import AddKeyOrCryptidAccountModal from "../Cryptid/AddKeyOrCryptidAccountModal";
import { useCryptid } from "../../utils/Cryptid/cryptid";
import { useSendTransaction } from "../../utils/notifications";

interface WalletListInterface {
  wallets: ExtendedPersistedWalletType[]
  removeCB?: (base58Key: string) => void
}

const hasLocalKey = (wallet: ExtendedPersistedWalletType) => {
  return !!wallet.walletIndex || !!wallet.privateKey?.bs58Cipher
}

export default function WalletList({ wallets, removeCB }: WalletListInterface) {

  const { getDidPrefix } = useCryptid();
  const [addKeyDialogOpen, setAddKeyDialogOpen] = useState(false);

  return (
    <>
      <AddKeyOrCryptidAccountModal
        open={addKeyDialogOpen}
        onClose={() => setAddKeyDialogOpen(false)}
        onAddKey={() => setAddKeyDialogOpen(false)} // Note: Modal add's keys internally already.
        currentAccountAlias={'Direct'}
        didPrefix={getDidPrefix()}
        modalType={"key"}
      />
      <div className="flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-500">Registered Wallets</p>
                      <button className="ml-2" onClick={() => setAddKeyDialogOpen(true)}><PlusCircleIcon className="h-4 w-4" aria-hidden="true"/></button>
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Local Key
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Active
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {wallets.map((wallet) => (
                  <tr key={wallet.bs58PublicKey}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <WalletAvatar address={wallet.bs58PublicKey} className={'h-10 w-10'}/>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{wallet.name}</div>
                          <div className="text-sm text-gray-500">{wallet.bs58PublicKey}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{WalletTypeString[wallet.type]}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {hasLocalKey(wallet) && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Yes
                        </span>}
                      {!hasLocalKey(wallet) && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          No
                        </span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {wallet.isActive && <CheckCircleIcon className="ml-1 text-green-500 w-6 h-6"/>}
                      {!wallet.isActive && <XCircleIcon className="ml-1 text-red-500 w-6 h-6"/>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {removeCB &&
                      <div>
                          <button onClick={() => removeCB && removeCB(wallet.bs58PublicKey)}>
                              <MinusCircleIcon className="ml-1 w-6 h-6"/>
                          </button>
                      </div>
                      }
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
