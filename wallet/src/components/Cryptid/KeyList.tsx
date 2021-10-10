import { PublicKey } from "@solana/web3.js";
import WalletAvatar from "../Wallet/WalletAvatar";
import React from "react";
import { CheckCircleIcon } from "@heroicons/react/solid";

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
  key: string,
  isActive: boolean,
  airdropCB?: (key: PublicKey) => void,
  removeCB?: (key: PublicKey) => void,
}

type KeyListInterface = {
  items: KeyListItem[]
}

export default function KeyList({items}: KeyListInterface) {
  return (
    <ul role="list" className="divide-y divide-gray-200">
      {items.map((item) => (
        <li key={item.key} className="py-4 flex items-center">
          <WalletAvatar address={item.key} className={'h-10 w-10'}/>
          <div className="ml-3">
            <div className="inline-flex">
              <p className="text-sm font-medium text-gray-900">{item.alias}</p>
              {item.isActive && <CheckCircleIcon className="ml-1 text-green-500 w-5 h-5"/>}
            </div>
            <p className="text-sm text-gray-500">{item.key}</p>
          </div>
          <div className="flex-grow" />
          <div>
            <p>Active: {item.isActive.toString()}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
