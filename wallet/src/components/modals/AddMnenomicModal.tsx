import React, { useCallback, useEffect, useState } from 'react';
import {Modal} from "../modals/modal";
import { KeyIcon } from "@heroicons/react/outline";
import { useWalletContext } from "../../utils/wallet";
import { useCallAsync } from "../../utils/notifications";
import { generateMnemonicAndSeed, storeMnemonicAndSeed } from "../../utils/wallet-seed";
import { DERIVATION_PATH } from "../../utils/Wallet/AccountWallet";

type MnemonicAndSeedType = {
  mnemonic: string | undefined,
  seed: string | undefined,
}

type AddMnemonicModalInterface = {
  show: boolean,
  onOK: () => void,
  onClose: () => void
}

export default function AddMnemonicModal({show, onOK, onClose}: AddMnemonicModalInterface) {

  const [mnemonicAndSeed, setMnemonicAndSeed] = useState<MnemonicAndSeedType>({ mnemonic: undefined, seed: undefined });
  const [acknowledged, setAcknowledged] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [confirmedWords, setConfirmedWords] = useState('');


  const [savedWords, setSavedWords] = useState(false);
  const callAsync = useCallAsync();

  const submit = (password?: string) => {
    const { mnemonic, seed } = mnemonicAndSeed;
    callAsync(
      storeMnemonicAndSeed(
        mnemonic,
        seed,
        password,
        DERIVATION_PATH.bip44Change,
      ),
      {
        progressMessage: 'Creating wallet...',
        successMessage: 'Wallet created',
      },
    );
  }

  useEffect(() => {
    console.log('useEffect AddMnemonicModal')
    if (!show) {
      return
    }

    generateMnemonicAndSeed().then(setMnemonicAndSeed);
  }, [ show ]);

  const downloadMnemonic = (mnemonic) => {
    const url = window.URL.createObjectURL(new Blob([mnemonic]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'cryptid.bak');
    document.body.appendChild(link);
    link.click();
  }

  return (
    <Modal
      show={show}
      callbacks={{
        onOK: () => { submit(); onOK() },
        onClose
      }}
      title='Mnemonic Seedphrase'
      Icon={KeyIcon}
      iconClasses='text-green-500'
      okText='Add'
      okEnabled={acknowledged && downloaded && confirmedWords === mnemonicAndSeed.mnemonic}
    >
      <div className="w-full">
        <div className="space-y-8 divide-y divide-gray-200 sm:space-y-5">
          <div>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

              <div className="sm:col-span-6">
                <p className="mt-1 max-w-2xl text-sm font-bold text-gray-500">
                  Please write down the following twenty four words and keep them in a safe place:
                </p>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="alias" className="block text-sm font-medium text-gray-700">
                  Seed Words
                </label>
                <div className="mt-1">
                <textarea
                  data-testid='seedWords'
                  id="about"
                  name="about"
                  rows={3}
                  className="px-3 py-2 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                  value={mnemonicAndSeed.mnemonic}
                  readOnly={true}
                />
                </div>
              </div>

              <div className="sm:col-span-6">
                <p className="mt-1 max-w-2xl text-sm font-bold text-gray-500">
                  Your private keys are only stored on your current computer or device. You will need these words to restore your wallet if your browser's storage is cleared or your device is damaged or lost.
                </p>
              </div>

              <div className="sm:col-span-6">
                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="comments"
                      name="comments"
                      type="checkbox"
                      className="focus:ring-red-600 h-4 w-4 text-red-600 border-gray-300 rounded"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="comments" className="font-medium text-red-600">
                      Acknowledgement
                    </label>
                    <p className="text-gray-500">I've saved these words in a safe place.</p>
                  </div>
                </div>
              </div>

              {acknowledged && <div className="sm:col-span-6">
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => {
                    downloadMnemonic(mnemonicAndSeed.mnemonic);
                    setDownloaded(true)
                  }}
                >
                  Download Seed Words (required)
                </button>
              </div>}

              {downloaded && <div className="sm:col-span-6">
                      <label htmlFor="alias" className="block text-sm font-medium text-gray-700">
                          Confirm Seed Words
                      </label>
                      <div className="mt-1">
                <textarea
                    id="about"
                    data-testid='confirmedWords'
                    name="about"
                    rows={3}
                    className="px-3 py-2 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                    value={confirmedWords}
                    onChange={(e) => setConfirmedWords(e.target.value.trim())}
                />
                      </div>
              </div>}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
