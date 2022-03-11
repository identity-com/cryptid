import {useCryptid} from "../utils/Cryptid/cryptid";
import React, {useEffect, useState} from "react";
import {PublicKey} from "@solana/web3.js";
import {CryptidButton} from "../components/balances/CryptidButton";
import {RefreshIcon, ReceiptRefundIcon} from "@heroicons/react/solid";
import {useSendTransaction} from "../utils/notifications";

export default function ProposedPage() {
  const {selectedCryptidAccount} = useCryptid()
  const [sendTransaction] = useSendTransaction();

  const [history, setHistory] = useState([] as { ready: boolean, key: PublicKey }[] | undefined);

  const updateHistory = async () => {
    if (!selectedCryptidAccount?.didAddress) {
      setHistory([]);
      return;
    }

    const accounts = await selectedCryptidAccount.listPendingTx();

    setHistory(accounts);
  }

  const cancelAccount = async (account) => {
    // TODO (BRETT): Replace with Cryptid cancel
    if (history) {
      setHistory(history.filter(h => h.key !== account));
    }

    // refresh once the cancel is complete
    // await updateHistory();
  }

  const retryAccount = async (account: PublicKey) => {
    if (!selectedCryptidAccount) {
      return;
    }
    const trx = selectedCryptidAccount?.signExecuteLarge(account);

    sendTransaction(trx, {
      onSuccess: updateHistory,
    })
  }

  useEffect(() => {
    updateHistory();
  }, [selectedCryptidAccount]);

  return (
    <>
      <div className="py-10">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6"><h3 className="text-lg leading-6 font-medium text-gray-900">Pending
              Transactions</h3></div>
            {history && history.length ?
              <ul role="list" className="divide-y divide-gray-200">
                {history.map(({key, ready}) => {
                  return (<li key={key.toBase58()}>
                    <div className="py-2 bg-gray-50 sm:grid sm:grid-cols-2 sm:gap-4 sm:px-6">
                      <div
                        className="min-w-0 w-1.5 md:max-w-max flex-1 flex-grow flex md:pr-4 md:gap-4 items-center">
                        {key.toBase58()}
                      </div>
                      <div className="inline-flex">
                        <div className="flex-grow"/>
                        <div>
                          <CryptidButton additionalClasses="mr-1" label="Refund" Icon={ReceiptRefundIcon}
                                         tooltip="Refund and Delete this Transaction" onClick={() => {
                                           cancelAccount(key);
                                         }} />
                          <CryptidButton disabled={!ready} label="Retry" Icon={RefreshIcon} onClick={() => {
                            retryAccount(key);
                          }} tooltip={ready ? undefined : 'Retry not available'}/>
                        </div>
                      </div>
                    </div>
                  </li>)
                })}
              </ul>
              : <div className="bg-gray-50 text-center py-4">
                {history === undefined ?
                  <span>Loading Transactions</span> :
                  <span>No Proposed Transactions Found</span>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </>
  )
}
