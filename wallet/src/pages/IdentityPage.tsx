import React from 'react';
import {CryptidDetails} from "../components/Cryptid/CryptidDetails";
import {useCryptid} from "../utils/Cryptid/cryptid";
import WalletList from "../components/Wallet/WalletList";
import { useWalletContext } from "../utils/wallet";

export default function WalletPage() {
  const { selectedCryptidAccount } = useCryptid()
  const { listWallets, setShowAddMnemonicDialog, showAddMnemonicDialog } = useWalletContext()

  return (
    <>
      <div className="py-10">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul role="list" className="divide-y divide-gray-200">
              {selectedCryptidAccount &&
              <CryptidDetails cryptidAccount={selectedCryptidAccount}/>}
            </ul>
          </div>
        </div>
      </div>
      <div className="py-10">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <WalletList wallets={listWallets()} />
        </div>
      </div>
      <div className="py-10">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={() => setShowAddMnemonicDialog(true)}
          >
            Set Mnemonic
          </button>
        </div>
      </div>
    </>
  );
}
