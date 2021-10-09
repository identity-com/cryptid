import React from 'react';
import { useIsProdNetwork } from '../utils/connection';
import DebugButtons from '../components/DebugButtons';
import { useIsExtensionWidth } from '../utils/utils';
import Grid from "@material-ui/core/Grid";
import {CryptidDetails} from "../components/Cryptid/CryptidDetails";
import {useCryptid} from "../utils/Cryptid/cryptid";
import WalletList from "../components/Wallet/WalletList";
import { useWalletContext } from "../utils/wallet";

export default function WalletPage() {
  const { selectedCryptidAccount } = useCryptid()
  const { listWallets } = useWalletContext()

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
    </>
  );
}
