import React from 'react';
import BalancesList from '../components/BalancesList';
import { useIsProdNetwork } from '../utils/connection';
import DebugButtons from '../components/DebugButtons';
import { useIsExtensionWidth } from '../utils/utils';

export default function WalletPage() {
  const isProdNetwork = useIsProdNetwork();
  const isExtensionWidth = useIsExtensionWidth();
  return (
    <div className="py-10">
      <header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">Dashboard</h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <BalancesList />
        </div>
      </main>
    </div>
  );
}
