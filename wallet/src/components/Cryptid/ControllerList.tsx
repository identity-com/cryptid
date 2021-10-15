import { PublicKey } from "@solana/web3.js";
import WalletAvatar from "../Wallet/WalletAvatar";
import React from "react";
import { CheckCircleIcon, MinusCircleIcon, PaperAirplaneIcon } from "@heroicons/react/outline";
import { useIsProdNetwork } from "../../utils/connection";

export type ControllerListItem = {
  controllerDid: string,
  removeCB?: (controllerDid: string) => void,
}

type ControllerListInterface = {
  items: ControllerListItem[]
}

export default function ControllerList({items}: ControllerListInterface) {

  return (
    <ul role="list" className="divide-y divide-gray-200">
      {items.map((item) => (
        <li key={item.controllerDid} className="py-4 flex items-center">
          <div>
            <p className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{item.controllerDid}</p>
          </div>
          <div className="flex-grow" />
          {item.removeCB &&
          <div>
              <button onClick={() => item.removeCB && item.removeCB(item.controllerDid)}>
              <MinusCircleIcon className="w-6 h-6"/>
              </button>
          </div>
          }
        </li>
      ))}
    </ul>
  )
}
