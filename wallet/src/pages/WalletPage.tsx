import React from 'react';
import BalancesList from '../components/BalancesList';
import {CryptidSummary} from "../components/Cryptid/CryptidSummary";
import {useCryptid} from "../utils/Cryptid/cryptid";

export default function WalletPage() {
  const { selectedCryptidAccount } = useCryptid()
  console.log("rerender ", selectedCryptidAccount);
  console.log(selectedCryptidAccount?.activeSigningKey?.toBase58());
  return (
    <>
      {selectedCryptidAccount && <CryptidSummary cryptidAccount={selectedCryptidAccount}/>}
      {selectedCryptidAccount && <BalancesList />}
    </>
  );
}
