import React from 'react';
import {CryptidDetails} from "../components/Cryptid/CryptidDetails";

import {useCryptid} from "../utils/Cryptid/cryptid";
import WalletList from "../components/Wallet/WalletList";
import { useWalletContext } from "../utils/wallet";
import WalletList2 from "../components/Wallet/WalletList2";

export default function IdentityPage() {
  const { selectedCryptidAccount } = useCryptid()
  const { listWallets, connectWallet, wallet } = useWalletContext()

  return (
    <>
      <div className="py-10">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul role="list" className="divide-y divide-gray-200">
              {selectedCryptidAccount &&
              <CryptidDetails cryptidAccount={selectedCryptidAccount} connectWallet={connectWallet} wallet={wallet}/>}
            </ul>
          </div>
        </div>
      </div>

      <div className="py-10">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <WalletList2 wallets={listWallets()} removeCB={() => alert('Remove not implemented')} />
        </div>
      </div>

      {/*<div className="py-10">*/}
      {/*  <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">*/}
      {/*    <WalletList wallets={listWallets()} removeCB={() => alert('Remove not implemented')} />*/}
      {/*  </div>*/}
      {/*</div>*/}
    </>
  );
}
