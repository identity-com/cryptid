import {useCryptid} from "../utils/Cryptid/cryptid";
import {useConnection} from "../utils/connection";
import React, {useEffect, useState} from "react";
import {CryptidDetails} from "../components/Cryptid/CryptidDetails";
import {PublicKey, SystemProgram, Transaction} from "@solana/web3.js";
import {CryptidButton} from "../components/balances/CryptidButton";
import {ArrowCircleDownIcon, ArrowCircleUpIcon} from "@heroicons/react/solid";
import bs58 from "bs58";
import {useWalletContext} from "../utils/wallet";
import {useSendTransaction} from "../utils/notifications";

export default function ProposedPage() {
  const {selectedCryptidAccount} = useCryptid()

  const walletContext = useWalletContext();

  // TODO (BRETT): Replace with method from Cryptid to fetch the accounts
  const connection = useConnection();
  const getIncompleteProposed = async () => {
    if (!selectedCryptidAccount?.didAddress) {
      return [];
    }

    return connection.getProgramAccounts(new PublicKey('crypt1GWL27FYSg7gEfJVzbc8KzEcTToFNmaXi9ropg'), {
      filters: [
        {
          "memcmp": {
            "offset": 101, //223
            "bytes": selectedCryptidAccount?.didAddress
          }
        }
      ]
    });
  }


  const [history, setHistory] = useState(undefined as string[] | undefined);

  const updateHistory = async () => {
    if (!selectedCryptidAccount?.didAddress) {
      setHistory([]);
      return;
    }

    const pa = await getIncompleteProposed();

    const newHistory: string[] = [];
    pa.forEach(a => {
      newHistory.push(a.pubkey.toBase58());
    });

    setHistory(newHistory);
  }

  const cancelAccount = async (account) => {
    // TODO (BRETT): Replace with Cryptid cancel
    const accountInfo = await connection.getAccountInfo(new PublicKey(account));
    if (history) {
      setHistory(history.filter(h => h !== account));
    }

    // refresh once the cancel is complete
    // await updateHistory();
  }

  const [sendTransaction, sending] = useSendTransaction();
  const retryAccount = async (account) => {
    const executeEncoded = 'L4Ue3akEN77AyWsLycRxKMJR2SiEkufwZCN6d5Exy7P261d3qBHsYqTai4nafQVDwk2opxPYgh8pVGep4S5awV31xde5fgMdoy6L3qj3pywpj4gbpySwamjbYcsyuhFqGnACMx1erAPYeygp9Vd6YxZfx9BM99nJVyXEfsiA1SA1TVzQG56aqUyBHXfii5x91YvUVDNvm6BjJ9i8wDr1qdPGEN9KtYeQ83g1jid5g5tCkHW6sWffYunbCbdowfr19iNnpGttpruZmVR7TnBCQLPWdgsw1Kk7J3BzhSnuFk8hBJrLjWDujJo1B5WU4bxfh1zqaGEMx72BrGch2kfrG6SGjfN53Ac9DQ9i3rG8JmdvSYLaSdqLR8AAeTL6Kmi6Tzy4sapeXVSyDQHYU7MgRG8r3t9Qn9EC5EMrSybEs3hccfUK2iZFnBqrSFGN9fUnNrRdLfw3zAhRyAbRSYPd8ag35eZSsn89f3qHQaMFn9Bis4t6yUfpRpCQMgosJ3N4k32BwmSkkHY8tchvxNk2XrzTHgKFZf7mnby9mMyZ';

    if(walletContext !== null && walletContext !== undefined) {
      console.log(walletContext);
      const transaction = await Transaction.from(bs58.decode(executeEncoded));
    }



    // refresh once the cancel is complete
    // await updateHistory();
  }

  useEffect(() => {
    updateHistory();
  }, [selectedCryptidAccount]);

  return (
    <>
      <div className="py-10">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6"><h3 className="text-lg leading-6 font-medium text-gray-900">Proposed
              Transactions</h3></div>
            {history && history.length ?
              <ul role="list" className="divide-y divide-gray-200">
                {history.map((account) => {
                  return (<li key={account}>
                    <div className="bg-gray-50 sm:grid sm:grid-cols-2 sm:gap-4 sm:px-6">
                      <div
                        className="min-w-0 w-1.5 md:max-w-max flex-1 flex-grow flex pl-4 md:pr-4 md:gap-4 items-center">
                        {account}
                      </div>
                      <div className="inline-flex">
                        <div className="flex-grow"/>
                        <div>
                          <CryptidButton label="Cancel" Icon={ArrowCircleDownIcon} onClick={() => {
                            cancelAccount(account);
                          }}/>
                          <CryptidButton label="Try Again" Icon={ArrowCircleUpIcon} onClick={() => {
                            retryAccount(account);
                          }}/>
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
