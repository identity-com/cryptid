import { useState } from 'react';
import { Switch } from '@mui/material';
import SpendingLimit from './Middleware/SpendingLimit';

// Middleware component for Cryptid. Easy to add new middleware sub-components in the same format as SpendingLimit if required.
export const CryptidMiddleware = () => {
  // Hooks
  const [spendingLimitActive, setSpendingLimitActive] = // Is the activation switch on or off
    useState<boolean>(false);

  return (
    <>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Spending Limit{' '}
            {
              <Switch
                color="warning"
                checked={spendingLimitActive}
                onChange={(e) => setSpendingLimitActive(e.target.checked)}
              />
            }
          </h3>
        </div>
        {spendingLimitActive ? <SpendingLimit /> : ''}
      </div>
    </>
  );
};
