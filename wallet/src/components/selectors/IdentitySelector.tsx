import { CryptidAccount, useCryptid } from '../../utils/Cryptid/cryptid';
import React, { Fragment, useCallback, useEffect, useState } from 'react';
import AddCryptidAccountDialog from '../Cryptid/AddCryptidAccountDialog';
import { Menu, Transition } from '@headlessui/react';
import { complement } from 'ramda';

const classNames = (...classes) => classes.filter(Boolean).join(' ');

type CryptidAccountMenuItemProps = {
  item: CryptidAccount
  setSelectedCryptidAccount: (value: CryptidAccount) => void,
}
const CryptidAccountMenuItem = ({item, setSelectedCryptidAccount}: CryptidAccountMenuItemProps) => (
  <Menu.Item key={item.alias || item.did} onClick={() => setSelectedCryptidAccount(item)}>
    {({ active }) => (
      <a
        // href={item.did}
        className={classNames(
          active ? 'bg-gray-100' : '',
          'block px-4 py-2 text-sm text-gray-700'
        )}
      >
        {item.alias}
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

  const onAdd = useCallback(async (address: string, alias: string, isControlled: boolean) => {
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
    <div className={isSignerWindow ? "flex items-center" : "hidden sm:ml-2 sm:flex sm:items-center"}>
      <AddCryptidAccountDialog
        open={addCryptidAccountDialogOpen}
        onClose={() => setCryptidAccountDialogOpen(false)}
        onAdd={onAdd}
        didPrefix={getDidPrefix()}
        currentAccountAlias={selectedCryptidAccount?.alias}
      />
      {/* Identity dropdown */}
      <Menu as="div" className="relative">
        <div>
          <Menu.Button className="max-w-xs bg-white text-gray-400 flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-800">
            <span className="sr-only">Select Identity</span>
            {/*<UserIcon className="h-6 w-6" aria-hidden="true"/>*/}
            <span className="inline-block h-12 w-12 rounded-full overflow-hidden bg-gray-100">
        <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
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
          <Menu.Items className="z-30 origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
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
