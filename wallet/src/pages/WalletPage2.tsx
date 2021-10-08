import React from 'react';
import BalancesList from '../components/BalancesList2';
import {CryptidSummary} from "../components/Cryptid/CryptidSummary";
import {useCryptid} from "../utils/Cryptid/cryptid";
import { AddCryptidButton, CryptidSelector } from '../components/Cryptid/CryptidSelector';

export default function WalletPage() {
  const { selectedCryptidAccount } = useCryptid()
  return (
    <div className="py-10">
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <AddCryptidButton />
        {/*{selectedCryptidAccount && <CryptidSummary cryptidAccount={selectedCryptidAccount}/>}*/}
        {/*<BalancesList />*/}
      </div>
    </div>
  );
}
