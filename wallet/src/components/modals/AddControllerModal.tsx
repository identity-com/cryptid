import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from "../modals/modal";
import { PlusCircleIcon } from "@heroicons/react/outline";
import { convertToPublicKey } from "../../utils/Cryptid/cryptid";
import { PublicKey } from "@solana/web3.js";



interface AddControllerModalInterface {
  open: boolean,
  onAdd: (controllerPublicKey: PublicKey) => void,
  onClose: () => void,
  didPrefix: string,
}

export default function AddControllerModal(
  {open, onAdd, onClose, didPrefix}: AddControllerModalInterface) {

  const [controllerAddress, setControllerAddress] = useState<PublicKey | undefined>();

  const setValidatedAddress = useCallback((value: string) => {
    setControllerAddress(convertToPublicKey(value));
  }, [setControllerAddress]);


  return (
    <Modal
      show={open}
      callbacks={{
        onOK: () => !!controllerAddress && onAdd(controllerAddress),
        onClose
      }}
      title='Add Controller'
      Icon={PlusCircleIcon}
      iconClasses='text-green-500'
      okText='Add'
      okEnabled={!!controllerAddress}
    >
      <div className="w-full">
        <div className="space-y-8 divide-y divide-gray-200 sm:space-y-5">
          <div>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">


                  <div className="sm:col-span-6">
                      {/*<label htmlFor="controller" className="block text-sm font-medium text-gray-700">*/}
                      {/*    Controller*/}
                      {/*</label>*/}
                      <div className="mt-1 flex rounded-md shadow-sm w-full">
                    <span
                        className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                      {didPrefix}:
                    </span>
                          <input type="text" name="controller" id="controller"
                                 className="flex-1 px-3 py-2 focus:ring-red-800 focus:border-indigo-500 block w-full min-w-0 rounded-none rounded-r-md border sm:text-sm border-gray-300"
                                 data-testid="controllerAddressField"
                                 placeholder="Address"
                                 onChange={(e) => setValidatedAddress(e.target.value.trim())}
                          />
                      </div>
                  </div>

            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
