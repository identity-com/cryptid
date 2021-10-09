import React from 'react';
import BalancesList from '../components/BalancesList';
import {CryptidSummary} from "../components/Cryptid/CryptidSummary";
import {useCryptid} from "../utils/Cryptid/cryptid";

export default function WalletPage() {
  const { selectedCryptidAccount } = useCryptid()
  console.log("rerender ", selectedCryptidAccount);
  console.log(selectedCryptidAccount?.activeSigningKey?.toBase58());
  return (
    <div className="py-10">
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
        {selectedCryptidAccount && <CryptidSummary cryptidAccount={selectedCryptidAccount}/>}
        <BalancesList />
      </div>
    </div>
  );
}
