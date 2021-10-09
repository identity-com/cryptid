import React, { useCallback, useState } from 'react';
import {Modal} from "../modals/modal";
import {PlusCircleIcon} from "@heroicons/react/outline";
import { convertToPublicKey, CryptidAccount } from "../../utils/Cryptid/cryptid";
import CryptidTypeSelector, { AddCrytidType } from "./CryptidTypeSelector";
import { useWalletContext } from "../../utils/wallet";
import { Keypair, PublicKey } from "@solana/web3.js";
import { decodeAccount } from "../../utils/utils";
import { useWallet as useAdapterWallet } from "@solana/wallet-adapter-react/lib/useWallet";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";


interface AddCryptidAccountDialogInterface {
  open: boolean,
  onAdd: (address: string, alias: string, isControlled: boolean) => void,
  onClose: () => void,
  didPrefix: string,
  currentAccountDid?: string
}

export default function AddCryptidAccountDialog(
  { open, onAdd, onClose, didPrefix }: AddCryptidAccountDialogInterface) {

  const { addWallet } = useWalletContext()
  const adapterWallet = useAdapterWallet()

  const [alias, setAlias] = useState('');

  const [addCryptidType, setAddCryptidType] = useState<AddCrytidType>('adapterkey');
  const [importAddress, setImportAddress] = useState<PublicKey|undefined>();
  const [isControlled, setIsControlled] = useState(false);

  const [importKeyPair, setImportKeyPair] = useState<Keypair|undefined>();

  const setValidatedAddress = useCallback((value: string) => {
    setImportAddress(convertToPublicKey(value));
  }, [setImportAddress]);

  const setValidatedImportKeyPair = useCallback((value: string) => {
    setImportKeyPair(decodeAccount(value));
  }, [setImportKeyPair]);

  const okEnabled = useCallback(() => {
    return !!alias &&
      ((addCryptidType === 'import' && !!importAddress) ||
        (addCryptidType === 'newkey') ||
        (addCryptidType === 'importkey' && !!importKeyPair) ||
        (addCryptidType === 'adapterkey' && !!adapterWallet.publicKey))
  }, [addCryptidType, importAddress, alias, importKeyPair])

  const onOk = useCallback(async () => {
    let address;

    if (addCryptidType !== "import") {
      // create a wallet for the new Account
      const useAdapter = addCryptidType === 'adapterkey'
      const publicKey = await addWallet(alias, useAdapter, importKeyPair)
      address = publicKey.toBase58();
    }

    // import case
    if (!address){
      address = (importAddress as PublicKey).toBase58() // okEnabled verifies correct PubKey
    }

    onAdd(address, alias, isControlled)
  }, [addCryptidType, addWallet, importAddress, alias, isControlled])

  return (
    <Modal
      show={open}
      callbacks={{
        onOK: onOk,
        onCancel: onClose
      }}
      title='Add Cryptid Account'
      Icon={PlusCircleIcon}
      iconClasses='text-green-500'
      okText='Add'
      okEnabled={okEnabled()}
      suppressClose={true}
    >
      <div className="w-full">
        <div className="space-y-8 divide-y divide-gray-200 sm:space-y-5">
          <div>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">


              <div className="sm:col-span-6">
                <label htmlFor="street-address" className="block text-sm font-medium text-gray-700">
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
                  <CryptidTypeSelector initialType={addCryptidType} onChange={setAddCryptidType} />
                </div>
              </div>

              { addCryptidType === 'importkey' &&
              <div className="sm:col-span-6">
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
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

              { addCryptidType === 'adapterkey' &&
              <div className="sm:col-span-6">
                  <div className="mt-1 flex justify-center">
                    <WalletMultiButton/>
                  </div>
              </div>
              }


              { addCryptidType === 'import' &&
                <div className="sm:col-span-6">
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                        Cryptid Account
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm w-full">
                    <span
                        className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                      {didPrefix}:
                    </span>
                        <input type="text" name="address" id="address"
                               className="flex-1 px-3 py-2 focus:ring-red-800 focus:border-indigo-500 block w-full min-w-0 rounded-none rounded-r-md border sm:text-sm border-gray-300"
                               placeholder="Address"
                               // value={importAddress}
                               onChange={(e) => setValidatedAddress(e.target.value.trim())}
                        />
                    </div>
                </div>
              }
          </div>
      </div>
      {/*{ currentAccount &&*/}
      {/*<div>*/}
      {/*  <FormGroup>*/}
      {/*    <FormControlLabel*/}
      {/*      control={*/}
      {/*        <Switch*/}
      {/*          checked={isControlled}*/}
      {/*          onChange={() => setIsControlled(!isControlled)}*/}
      {/*        />*/}
      {/*      }*/}
      {/*      label={`Controlled by`}*/}
      {/*    />*/}
      {/*  </FormGroup>*/}
      {/*  <Typography>*/}
      {/*    {currentAccount}*/}
      {/*  </Typography>*/}
      {/*</div> }*/}
        </div>
      </div>
    </Modal>
  );
}
