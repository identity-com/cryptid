import React from 'react';
import {Modal} from "../modals/modal";
import { KeyIcon } from "@heroicons/react/outline";
import { useWalletContext } from "../../utils/wallet";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useCryptid } from "../../utils/Cryptid/cryptid";
import { useWallet as useAdapterWallet } from "@solana/wallet-adapter-react/lib/useWallet";


export default function WalletConnectModal() {

  const { showWalletConnectDialogWithPublicKey, setShowWalletConnectDialogWithPublicKey } = useWalletContext();
  const { selectedCryptidAccount } = useCryptid();
  const { publicKey } = useAdapterWallet()


  // What wallet should be connected?

  return (
    <Modal
      show={!!showWalletConnectDialogWithPublicKey}
      callbacks={{
        onOK: () => { console.log('Pressed'); setShowWalletConnectDialogWithPublicKey(undefined) },
        onClose: () => { setShowWalletConnectDialogWithPublicKey(undefined) }
      }}
      title='Connect with Wallet-Adapter'
      Icon={KeyIcon}
      iconClasses='text-green-500'
      okText='Connect'
      okEnabled={publicKey?.toBase58() === showWalletConnectDialogWithPublicKey}
      suppressClose={true}
    >
      <div className="w-full">
        <div className="space-y-8 divide-y divide-gray-200 sm:space-y-5">
          <div>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

              <div className="sm:col-span-6">
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Cryptid Account {selectedCryptidAccount?.alias} would like to use the following wallet:
                </p>
                  <div className="m-4 flex justify-center">
                  <p className="mt-1 max-w-2xl text-sm font-bold text-gray-500">
                    {showWalletConnectDialogWithPublicKey}
                  </p>
                </div>
              </div>

              <div className="sm:col-span-6">
                <div className="mb-44 flex justify-center">
                  <WalletMultiButton/>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
