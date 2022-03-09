import { useEffect, useState } from 'react';
import { TextField, Switch } from '@mui/material';
import { Button } from '@material-ui/core';
import CurrencyTextField from '@unicef/material-ui-currency-textfield';
import { Keypair } from '@solana/web3.js';
import { createSpendingLimit } from '@identity.com/cryptid';

export const CryptidMiddleware = () => {
  // Hooks

  const [windowStart, setWindowStart] = useState<string>('');
  const [windowDuration, setWindowDuration] = useState<number>(0);
  const [spendingLimit, setSpendingLimit] = useState<number>(0);
  const [okayToCommit, setOkayToCommit] = useState<boolean>(false);
  const [spendingLimitActive, setSpendingLimitActive] =
    useState<boolean>(false);
  const [days, setDays] = useState<string>('');
  const [hours, setHours] = useState<string>('');
  const [minutes, setMinutes] = useState<string>('');

  useEffect(() => {
    let daysToMinutes: number;
    let hoursToMinutes: number;
    let parsedMinutes: number;
    if (days === '') {
      daysToMinutes = 0;
    } else {
      daysToMinutes = parseInt(days) * 1440;
    }

    if (hours === '') {
      hoursToMinutes = 0;
    } else {
      hoursToMinutes = parseInt(hours) * 60;
    }

    if (minutes === '') {
      parsedMinutes = 0;
    } else {
      parsedMinutes = parseInt(minutes);
    }

    const totalMinutes = daysToMinutes + hoursToMinutes + parsedMinutes;

    setWindowDuration(totalMinutes);
  }, [days, hours, minutes]);

  useEffect(() => {
    if (windowStart.length > 0 && spendingLimit > 0 && windowDuration > 0) {
      setOkayToCommit(true);
    } else {
      if (okayToCommit === true) {
        setOkayToCommit(false);
      }
    }
    //eslint-disable-next-line
  }, [windowStart, spendingLimit, windowDuration]);

  const handleCommitSpendingLimit = () => {

    const testerKeyPair = Keypair.generate();
    const pubKey = Keypair.generate().publicKey;

    createSpendingLimit(
      testerKeyPair,
      new Date(windowStart),
      windowDuration,
      spendingLimit,
      pubKey,
    ).then((res) => console.log("RES: ", res));

  };

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
        {spendingLimitActive ? (
          <div className="border-t border-gray-200">
            <dl>
              <div
                className="bg-gray-50 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  width: '100%',
                  paddingBottom: 20,
                  paddingTop: 0,
                }}
              >
                <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-gray-200 sm:pt-5">
                  <label
                    style={{ marginTop: 'auto', marginBottom: 'auto' }}
                    htmlFor="window-start"
                    className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"
                  >
                    Window Start
                  </label>
                  <TextField
                    id="datetime-local"
                    label="Window Start Date/Time"
                    type="datetime-local"
                    value={windowStart}
                    onChange={(e) => setWindowStart(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 250 }}
                  />
                </div>
              </div>
              <div
                className="bg-white px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  width: '100%',
                  paddingBottom: 20,
                }}
              >
                <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-gray-200 sm:pt-5">
                  <label
                    style={{ marginTop: 'auto', marginBottom: 'auto' }}
                    htmlFor="window-start"
                    className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"
                  >
                    Window Duration
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      width: 250,
                      justifyContent: 'space-evenly',
                    }}
                  >
                    <TextField
                      style={{ margin: '5px 5px 5px 0' }}
                      id="outlined-number"
                      label="Days"
                      type="number"
                      value={days}
                      onChange={(e) => {
                        if (parseInt(e.target.value) >= 0)
                          setDays(e.target.value);
                      }}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                    <TextField
                      style={{ margin: 5 }}
                      id="outlined-number"
                      label="Hours"
                      type="number"
                      value={hours}
                      onChange={(e) => {
                        if (parseInt(e.target.value) >= 0)
                          setHours(e.target.value);
                      }}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                    <TextField
                      style={{ margin: '5px 0 5px 5px' }}
                      id="outlined-number"
                      label="Minutes"
                      type="number"
                      value={minutes}
                      onChange={(e) => {
                        if (parseInt(e.target.value) >= 0)
                          setMinutes(e.target.value);
                      }}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div
                className="bg-gray-50 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  width: '100%',
                  paddingBottom: 20,
                  paddingTop: 0,
                }}
              >
                <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-gray-200 sm:pt-5">
                  <label
                    style={{ marginTop: 'auto', marginBottom: 'auto' }}
                    htmlFor="limit-amount"
                    className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"
                  >
                    Limit Amount
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      width: 250,
                      justifyContent: 'space-evenly',
                    }}
                  >
                    <CurrencyTextField
                      label="Spending Limit"
                      variant="outlined"
                      value={spendingLimit}
                      currencySymbol="SOL"
                      minimumValue="0"
                      outputFormat="number"
                      onChange={(e: any, value: number) =>
                        setSpendingLimit(value)
                      }
                      decimalPlaces={4}
                    />
                  </div>
                </div>
              </div>
              <div
                className="bg-white px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  width: '100%',
                  paddingBottom: 20,
                }}
              >
                <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-gray-200 sm:pt-5">
                  <label
                    style={{ marginTop: 'auto', marginBottom: 'auto' }}
                    htmlFor="window-start"
                    className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"
                  >
                    Commit Spending Limit
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      width: 250,
                      justifyContent: 'space-evenly',
                    }}
                  >
                    {okayToCommit ? (
                      <Button
                        onClick={() => handleCommitSpendingLimit()}
                        variant="contained"
                        style={{ backgroundColor: '#DE6B6E', color: '#F2EBD5' }}
                      >
                        Commit
                      </Button>
                    ) : (
                      <Button
                        disabled
                        onClick={() => handleCommitSpendingLimit()}
                        variant="contained"
                      >
                        Commit
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </dl>
          </div>
        ) : (
          ''
        )}
      </div>
    </>
  );
};
