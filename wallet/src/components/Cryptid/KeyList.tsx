import WalletAvatar from "../Wallet/WalletAvatar";
import React from "react";
import { CheckCircleIcon, MinusCircleIcon, PaperAirplaneIcon } from "@heroicons/react/outline";
import { useIsProdNetwork } from "../../utils/connection";
import {Tooltip} from '@material-ui/core';

export type KeyListItem = {
  alias: string,
  base58Key: string,
  isActive: boolean,
  capabilityInvocation: boolean,
  selectCB?: (base58Key: string, alias: string) => void,
  airdropCB?: (base58Key: string, alias: string) => void,
  removeCB?: (base58Key: string, alias: string) => void,
}

type KeyListInterface = {
  items: KeyListItem[]
}

function Wrapper({children, text}: { children: React.ReactElement, text: () => string | null }){
  const displayText = text();
  if (!displayText){
    return children;
  } else {
    return <Tooltip arrow title={displayText}>{children}</Tooltip>
  }
}

export default function KeyList({items}: KeyListInterface) {
  const isProdNetwork = useIsProdNetwork();

  const Avatar = ({ item }: {item: KeyListItem }) => <WalletAvatar address={item.base58Key} className={'h-10 w-10'}/>;
  const WrappedAvatar = ({ item }: {item: KeyListItem }) => {
    if (item.capabilityInvocation){
      return <button onClick={() => item.selectCB && item.selectCB(item.base58Key, item.alias)}>
        <Avatar item={item}/>
      </button>;
    } else {
      return <Tooltip arrow title={'Key does not have capability invocation permissions and cannot sign'}><div>
        <Avatar item={item}/>
      </div></Tooltip>;
    }
  }

  return (
    <ul className="divide-y divide-gray-200">
      {items.map((item) => (
        <li key={item.base58Key} className="py-4 flex items-center">
          <div>
            <WrappedAvatar item={item}/>
          </div>
          <div className="ml-3">
            <div className="inline-flex">
              <p className="text-sm font-medium text-gray-900" style={item.capabilityInvocation ? {} : { textDecoration: 'line-through' }}>{item.alias}</p>
              {item.isActive && <CheckCircleIcon className="ml-1 text-green-500 w-5 h-5"/>}
            </div>
            <p className="text-sm text-gray-500"  data-testid="didWalletAddress">{item.base58Key}</p>
          </div>
          <div className="flex-grow" />
          {item.capabilityInvocation && item.airdropCB && !isProdNetwork &&
          <div>
            <button onClick={() => item.airdropCB && item.airdropCB(item.base58Key, item.alias)}>
              <PaperAirplaneIcon className="ml-1 w-6 h-6"/>
            </button>
          </div>
          }
          {item.capabilityInvocation && item.removeCB &&
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
