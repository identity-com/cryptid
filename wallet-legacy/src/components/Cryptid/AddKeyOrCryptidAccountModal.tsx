import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from "../modals/modal";
import { PlusCircleIcon } from "@heroicons/react/outline";
import { convertToPublicKey, CryptidAccount } from "../../utils/Cryptid/cryptid";
import CryptidTypeSelector, { AddCryptidOrKeyTextType, AddCryptidOrKeyType } from "./CryptidTypeSelector";
import { useWalletContext } from "../../utils/wallet";
import { Keypair, PublicKey } from "@solana/web3.js";
import { decodeAccount } from "../../utils/utils";
import { useWallet as useAdapterWallet } from "@solana/wallet-adapter-react/lib/useWallet";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Switch } from '@headlessui/react'
import AddMnemonicModal from "../modals/AddMnenomicModal";


interface AddKeyOrCryptidAccountModalInterface {
  open: boolean,
  onAddCryptidAccount?: (address: string, alias: string, isControlled: boolean) => void,
  onAddKey?: (address: string, alias: string) => void,
  onClose: () => void,
  didPrefix: string,
  currentAccountAlias?: string
  modalType: AddCryptidOrKeyTextType
}

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

type ModalText = {
  [key in AddCryptidOrKeyTextType]: {
    title: string
    importHeadline: string
  }
}

const modalText: ModalText = {
  cryptid: {
    title: 'Add Cryptid Account',
    importHeadline: 'Cryptid Account',
  },
  key: {
    title: 'Add Key to Account',
    importHeadline: 'Address / Public Key',
  }
}

export default function AddKeyOrCryptidAccountModal(
  {open, onAddCryptidAccount, onAddKey, onClose, didPrefix, currentAccountAlias, modalType}: AddKeyOrCryptidAccountModalInterface) {

  const {addWallet, hasUnlockedMnemonic} = useWalletContext()
  const [showAddMnemonicDialog, setShowAddMnemonicDialog] = useState(false);

  const adapterWallet = useAdapterWallet()

  const [alias, setAlias] = useState('');

  const [addCryptidType, setAddCryptidType] = useState<AddCryptidOrKeyType>('adapterkey');
  const [importAddress, setImportAddress] = useState<PublicKey | undefined>();
  const [isControlled, setIsControlled] = useState(false);

  const [importKeyPair, setImportKeyPair] = useState<Keypair | undefined>();

  const setValidatedAddress = useCallback((value: string) => {
    setImportAddress(convertToPublicKey(value));
  }, [setImportAddress]);

  const setValidatedImportKeyPair = useCallback((value: string) => {
    setImportKeyPair(decodeAccount(value));
  }, [setImportKeyPair]);

  const onCryptidTypeChange = useCallback((type: AddCryptidOrKeyType) => {
    setAddCryptidType(type)

    console.log(`Changed type! hasUnlockedMnemonic: ${hasUnlockedMnemonic}`)

    if (!hasUnlockedMnemonic && (type === 'newkey' || type === 'importkey')) {
      setShowAddMnemonicDialog(true)
    }
  }, [setAddCryptidType, setShowAddMnemonicDialog, hasUnlockedMnemonic])

  const okEnabled = useCallback(() => {
    return (!!alias) &&
      ((addCryptidType === 'import' && !!importAddress) ||
        (addCryptidType === 'newkey' && hasUnlockedMnemonic) ||
        (addCryptidType === 'importkey' && !!importKeyPair && hasUnlockedMnemonic) ||
        (addCryptidType === 'adapterkey' && !!adapterWallet.publicKey))
  }, [addCryptidType, importAddress, alias, importKeyPair, adapterWallet.publicKey, hasUnlockedMnemonic])

  const onOK = useCallback(async () => {
    let address;

    if (addCryptidType !== "import") {
      // create a wallet for the new Account
      const useAdapter = addCryptidType === 'adapterkey'
      const keyAlias = modalType === 'cryptid' ? `${alias}_default` : `${currentAccountAlias}_${alias}`
      const publicKey = await addWallet(keyAlias, useAdapter, importKeyPair)
      address = publicKey.toBase58();
    }

    // import case
    if (!address) {
      address = (importAddress as PublicKey).toBase58() // okEnabled verifies correct PubKey
    }

    if (modalType === "cryptid" && onAddCryptidAccount) {
      onAddCryptidAccount(address, alias, isControlled)
      return
    }

    if (modalType === "key" && onAddKey) {
      onAddKey(address, alias)
      return
    }
  }, [addCryptidType, addWallet, importAddress, alias, isControlled, importKeyPair])


  return (
    <Modal
      show={open}
      callbacks={{
        onOK,
        onClose
      }}
      title={modalText[modalType].title}
      Icon={PlusCircleIcon}
      iconClasses='text-green-500'
      okText='Add'
      okEnabled={okEnabled()}
      suppressClose={true}
    >
      <AddMnemonicModal show={showAddMnemonicDialog} onOK={() => setShowAddMnemonicDialog(false)} onClose={() => setShowAddMnemonicDialog(false)} />
      <div className="w-full">
        <div className="space-y-8 divide-y divide-gray-200 sm:space-y-5">
          <div>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">


              <div className="sm:col-span-6">
                <label htmlFor="alias" className="block text-sm font-medium text-gray-700">
                  Alias
                </label>
                <div className="mt-1">
                  <input type="text" name="alias" id="alias"
                         className="px-3 py-2 shadow-sm focus:ring-red-800 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 border rounded-md"
                         placeholder="Alias"
                         value={alias}
                         onChange={(e) => setAlias(e.target.value.trim())}
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="street-address" className="block text-sm font-medium text-gray-700">
                  Type
                </label>
                <div className="mt-1">
                  <CryptidTypeSelector textType={modalType} initialType={addCryptidType} onChange={onCryptidTypeChange}/>
                </div>
              </div>

              {addCryptidType === 'importkey' &&
              <div className="sm:col-span-6">
                  <label htmlFor="importkey" className="block text-sm font-medium text-gray-700">
                      Private Key
                  </label>
                  <div className="mt-1">
                      <input type="text" name="importkey" id="importkey" autoComplete="importkey"
                             className="px-3 py-2 shadow-sm focus:ring-red-800 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 border rounded-md"
                             placeholder="Private Key"
                             onChange={(e) => setValidatedImportKeyPair(e.target.value.trim())}
                      />
                  </div>
              </div>
              }

              {addCryptidType === 'adapterkey' &&
              <div className="sm:col-span-6">
                  <div className="mb-44 flex justify-center">
                      <WalletMultiButton/>
                  </div>
              </div>
              }


              {addCryptidType === 'import' && <>
                  <div className="sm:col-span-6">
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                        {modalText[modalType].importHeadline}
                      </label>
                      <div className="mt-1 flex rounded-md shadow-sm w-full">
                        {modalType === "cryptid" &&
                          <span
                            className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                            {didPrefix}:
                          </span>}
                          <input type="text" name="address" id="address"
                                 className="flex-1 px-3 py-2 focus:ring-red-800 focus:border-indigo-500 block w-full min-w-0 rounded-none rounded-r-md border sm:text-sm border-gray-300"
                                 placeholder="Address"
                                 data-testid="publicAddressToImport"
                            // value={importAddress}
                                 onChange={(e) => setValidatedAddress(e.target.value.trim())}
                          />
                      </div>
                  </div>

                {currentAccountAlias && modalType === "cryptid" && <div className="sm:col-span-6">
                    <div className="m-1">
                        <Switch.Group as="div" className="flex items-center">
                            <Switch
                                checked={isControlled}
                                onChange={setIsControlled}
                                className={classNames(
                                  isControlled ? 'bg-indigo-600' : 'bg-gray-200',
                                  'relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                                )}
                            >
                                <span
                                    aria-hidden="true"
                                    className={classNames(
                                      isControlled ? 'translate-x-5' : 'translate-x-0',
                                      'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200'
                                    )}
                                />
                            </Switch>
                            <Switch.Label as="span" className="ml-3">
                                <span className="text-sm text-gray-500">Controlled by </span>
                                <span className="text-sm font-medium text-gray-900">{currentAccountAlias}</span>
                            </Switch.Label>
                        </Switch.Group>
                    </div>
                </div>}

              </>}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
