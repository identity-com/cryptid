import { CryptidAccount, useCryptid } from '../../utils/Cryptid/cryptid';
import React, { Fragment, useCallback, useEffect, useState } from 'react';
import AddKeyOrCryptidAccountModal from '../Cryptid/AddKeyOrCryptidAccountModal';
import { Menu, Transition } from '@headlessui/react';
import { complement } from 'ramda';
import {CheckIcon} from "@heroicons/react/outline";
import AliasAvatar from "../Cryptid/AliasAvatar";


const classNames = (...classes) => classes.filter(Boolean).join(' ');

type CryptidAccountMenuItemProps = {
  item: CryptidAccount
  setSelectedCryptidAccount: (value: CryptidAccount) => void,
}
const CryptidAccountMenuItem = ({item, setSelectedCryptidAccount}: CryptidAccountMenuItemProps) => (
  <Menu.Item key={item.alias || item.did} onClick={() => setSelectedCryptidAccount(item)}>
    {({ active }) => (
      <a
        className={classNames(
          active ? 'bg-gray-100' : '',
          'group flex px-4 py-2 text-sm text-gray-700'
        )}
      >
        {item.alias}
        {item.isSelected && <CheckIcon className="ml-1 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />}
      </a>
    )}
  </Menu.Item>
)

const isControlledBy = (account: CryptidAccount) => account.isControlled;

interface IdentitySelectorInterface {
  isSignerWindow: boolean
}

const IdentitySelector = ({ isSignerWindow }: IdentitySelectorInterface ) => {
  const {
    ready,
    cryptidAccounts,
    selectedCryptidAccount,
    setSelectedCryptidAccount,
    addCryptidAccount,
    getDidPrefix } = useCryptid()
  const [addCryptidAccountDialogOpen, setCryptidAccountDialogOpen] = useState(false);

  const onAddCryptidAccount = useCallback(async (address: string, alias: string, isControlled: boolean) => {
    let parent;
    if (isControlled && selectedCryptidAccount) {
      parent = selectedCryptidAccount
    }

    addCryptidAccount(address, alias, parent)
    setCryptidAccountDialogOpen(false)
  },[selectedCryptidAccount, addCryptidAccount])

  useEffect(() => {
    console.log(`READY: ${ready} cryptidAccounts.length: ${cryptidAccounts.length}`)
    if (ready && cryptidAccounts.length === 0) {
      setCryptidAccountDialogOpen(true)
    }
  }, [ready, cryptidAccounts, setCryptidAccountDialogOpen])


  return (
    <div className="flex items-center m-2">
      <AddKeyOrCryptidAccountModal
        open={addCryptidAccountDialogOpen}
        onClose={() => setCryptidAccountDialogOpen(false)}
        onAddCryptidAccount={onAddCryptidAccount}
        didPrefix={getDidPrefix()}
        currentAccountAlias={selectedCryptidAccount?.alias}
        modalType={"cryptid"}
      />
      {/* Identity dropdown */}
      <Menu as="div" className="z-40 relative">
        <div>
          <Menu.Button className="max-w-xs bg-white text-gray-400 flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-800">
            <span className="sr-only">Select Identity</span>
            <span className={classNames(
              selectedCryptidAccount?.isControlled ? 'bg-red-100' : 'bg-gray-100',
              'inline-block h-12 w-12 rounded-full overflow-hidden')}>
              <AliasAvatar alias={selectedCryptidAccount?.alias || '?'} />
            </span>
          </Menu.Button>
        </div>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="overflow-visible z-30 origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
            {cryptidAccounts.filter(complement(isControlledBy)).map((item) =>
              <CryptidAccountMenuItem item={item} setSelectedCryptidAccount={setSelectedCryptidAccount}/>
            )}
            <hr/>
            {cryptidAccounts.filter(isControlledBy).map((item) =>
              <CryptidAccountMenuItem item={item} setSelectedCryptidAccount={setSelectedCryptidAccount}/>
            )}
            {!isSignerWindow &&
            <>
              <hr />
              <Menu.Item key={'AddCryptid'} onClick={() => setCryptidAccountDialogOpen(true)}>
                <a className={classNames('bg-gray-100 block px-4 py-2 text-sm text-gray-700')}>
                  Add Cryptid
                </a>
              </Menu.Item>
            </>
            }
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  )
}

export default IdentitySelector
