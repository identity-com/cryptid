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

export default function WalletList2({ wallets, removeCB }: WalletListInterface) {

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
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="flex items-center px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Registered Wallets</h3>
          <button className="ml-2" onClick={() => setAddKeyDialogOpen(true)}><PlusCircleIcon className="h-6 w-6" aria-hidden="true"/></button>
          {/*<p className="mt-1 max-w-2xl text-sm text-gray-500">Personal details and application.</p>*/}
        </div>
        <div className="border-t border-gray-200">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul role="list" className="divide-y divide-gray-200">
              {wallets.map((wallet) => (
                <li key={wallet.bs58PublicKey}>
                  <a href="#" className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 truncate">{wallet.name}</p>
                        <div className="ml-2 flex-shrink-0 flex">
                          {wallet.isActive && <CheckCircleIcon className="ml-1 text-green-500 w-6 h-6"/>}
                          {!wallet.isActive && <XCircleIcon className="ml-1 text-red-500 w-6 h-6"/>}
                          {/*{removeCB &&*/}
                          {/*<div>*/}
                          {/*    <button onClick={() => removeCB && removeCB(wallet.bs58PublicKey)}>*/}
                          {/*        <MinusCircleIcon className="ml-1 w-6 h-6"/>*/}
                          {/*    </button>*/}
                          {/*</div>*/}
                          {/*}*/}
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <WalletAvatar address={wallet.bs58PublicKey} className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" aria-hidden="true" />
                          <p className="flex items-center text-sm text-gray-500">
                            {wallet.bs58PublicKey}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-2">
                            {hasLocalKey(wallet) && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Local
                            </span>}
                            {!hasLocalKey(wallet) && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              External
                            </span>}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p>
                            {WalletTypeString[wallet.type]}
                          </p>
                        </div>
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
