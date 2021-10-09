import React from "react";
import { ExtendedPersistedWalletType } from "../../utils/wallet";
import WalletAvatar from "./WalletAvatar";

interface WalletListInterface {
  wallets: ExtendedPersistedWalletType[]
}

export default function WalletList({ wallets }: WalletListInterface) {

  return (
    <div className="flex flex-col">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Key
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Type
                </th>
                {/*<th*/}
                {/*  scope="col"*/}
                {/*  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"*/}
                {/*>*/}
                {/*  active*/}
                {/*</th>*/}
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Active
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
              {wallets.map((wallet) => (
                <tr key={wallet.bs58PublicKey}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <WalletAvatar address={wallet.bs58PublicKey} className={'h-10 w-10'}/>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{wallet.name}</div>
                        <div className="text-sm text-gray-500">{wallet.bs58PublicKey}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{wallet.type}</div>
                  </td>
                  {/*<td className="px-6 py-4 whitespace-nowrap">*/}
                  {/*    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">*/}
                  {/*      Active*/}
                  {/*    </span>*/}
                  {/*</td>*/}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{wallet.isActive.toString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href="#" className="text-indigo-600 hover:text-indigo-900">
                      Edit
                    </a>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
