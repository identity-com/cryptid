import { PublicKey } from "@solana/web3.js";
import WalletAvatar from "../Wallet/WalletAvatar";
import React from "react";
import { CheckCircleIcon, MinusCircleIcon, PaperAirplaneIcon } from "@heroicons/react/outline";
import { useIsProdNetwork } from "../../utils/connection";

const people = [
  {
    name: 'Calvin Hawkins',
    email: 'calvin.hawkins@example.com',
    image:
      'https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
  {
    name: 'Kristen Ramos',
    email: 'kristen.ramos@example.com',
    image:
      'https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
  {
    name: 'Ted Fox',
    email: 'ted.fox@example.com',
    image:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
]

export type KeyListItem = {
  alias: string,
  base58Key: string,
  isActive: boolean,
  selectCB?: (base58Key: string, alias: string) => void,
  airdropCB?: (base58Key: string, alias: string) => void,
  removeCB?: (base58Key: string, alias: string) => void,
}

type KeyListInterface = {
  items: KeyListItem[]
}

export default function KeyList({items}: KeyListInterface) {
  const isProdNetwork = useIsProdNetwork();


  return (
    <ul role="list" className="divide-y divide-gray-200">
      {items.map((item) => (
        <li key={item.base58Key} className="py-4 flex items-center">
          <div>
            <button onClick={() => item.selectCB && item.selectCB(item.base58Key, item.alias)}>
              <WalletAvatar address={item.base58Key} className={'h-10 w-10'}/>
            </button>
          </div>
          <div className="ml-3">
            <div className="inline-flex">
              <p className="text-sm font-medium text-gray-900">{item.alias}</p>
              {item.isActive && <CheckCircleIcon className="ml-1 text-green-500 w-5 h-5"/>}
            </div>
            <p className="text-sm text-gray-500">{item.base58Key}</p>
          </div>
          <div className="flex-grow" />
          {item.airdropCB && !isProdNetwork &&
          <div>
            <button onClick={() => item.airdropCB && item.airdropCB(item.base58Key, item.alias)}>
              <PaperAirplaneIcon className="ml-1 w-6 h-6"/>
            </button>
          </div>
          }
          {item.removeCB &&
          <div>
              <button onClick={() => item.removeCB && item.removeCB(item.base58Key, item.alias)}>
              <MinusCircleIcon className="ml-1 w-6 h-6"/>
              </button>
          </div>
          }
        </li>
      ))}
    </ul>
  )
}
