import { Card, CardContent, List, ListItem, Typography } from "@material-ui/core";
import { CryptidAccount, useCryptid } from "../../utils/Cryptid/cryptid";
import Button from "@material-ui/core/Button";
import AddKeyIcon from "@material-ui/icons/VpnKeyOutlined";
import AddServiceIcon from "@material-ui/icons/RoomServiceOutlined";
import AddControllerIcon from "@material-ui/icons/SupervisorAccountOutlined";
import ListItemText from "@material-ui/core/ListItemText";
import AddKeyDialog from "./AddKeyDialog";
import { useCallback, useEffect, useState } from "react";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { useSnackbar } from "notistack";
import AddControllerDialog from "./AddControllerDialog";
import { useSendTransaction } from "../../utils/notifications";
import { KeyIcon, PaperClipIcon, UserIcon, UsersIcon } from "@heroicons/react/outline";
import {AddressLink} from "../AddressLink";
import {CryptidButton} from "../balances/CryptidButton";
import {PlusCircleIcon, XCircleIcon} from "@heroicons/react/outline";
import * as React from "react";
import {useIsProdNetwork} from "../../utils/connection";
import { useRequestAirdrop, WalletInterface } from "../../utils/wallet";
import AddControllerModal from "../modals/AddControllerModal";
import AddKeyOrCryptidAccountModal from "./AddKeyOrCryptidAccountModal";
import KeyList, { KeyListItem } from "./KeyList";

interface CryptidDetailsInterface {
  cryptidAccount: CryptidAccount
  connectWallet: (publicKey) => void
  wallet: WalletInterface
}

type SendTransaction = (s: Promise<TransactionSignature>, c: { onSuccess?: () => void; onError?: (err: any) => void } ) => void

// This is a hack because component will not understand prop change.
const useForceUpdate = () => {
  const [value, setValue] = useState(0); // integer state
  return () => setValue(value => value + 1); // update the state to force render
}

export const CryptidDetails = ({ cryptidAccount, connectWallet, wallet } : CryptidDetailsInterface) => {
  // Hooks
  const { getDidPrefix } = useCryptid();
  const forceUpdate = useForceUpdate();
  const [ sendTransaction ] = useSendTransaction() as [SendTransaction, boolean]
  const [addKeyDialogOpen, setAddKeyDialogOpen] = useState(false);
  const [addControllerDialogOpen, setAddControllerDialogOpen] = useState(false);
  const requestAirdrop = useRequestAirdrop();


  const onSuccessUpdate = (f?: () => void) => {
    if (f) {
      f();
    }
    cryptidAccount.updateDocument().then(forceUpdate)
  }

  const selectKeyCB = (base58Key: string, alias: string) => {
    const pk = new PublicKey(base58Key)
    connectWallet(pk)
  }

  const requestAirDrop = (base58Key: string) => {
    const pk = new PublicKey(base58Key)
    requestAirdrop(pk)
  }

  const addKeyCallback = (address: string, alias: string) => {
    const pk = new PublicKey(address)
    sendTransaction(cryptidAccount.addKey(pk, alias), {
      onSuccess: () => onSuccessUpdate(() => setAddKeyDialogOpen(false))
    });
  }

  const removeKeyCallback = (alias: string) => sendTransaction(cryptidAccount.removeKey(alias.replace('#','')), {
    onSuccess: () => onSuccessUpdate()
  });

  const addControllerCallback = (controllerPublicKey: PublicKey) => sendTransaction(cryptidAccount.addController(`${getDidPrefix()}:${controllerPublicKey.toBase58()}`), {
    onSuccess: () => onSuccessUpdate(() => setAddControllerDialogOpen(false))
  });

  const removeControllerCallback = (controllerDID: string) => sendTransaction(cryptidAccount.removeController(controllerDID), {
    onSuccess: () => onSuccessUpdate()
  });

  const getKeyListItems = useCallback((): KeyListItem[] => {
    return cryptidAccount.verificationMethods.filter(vm => !!vm.publicKeyBase58).map(vm => ({
      alias: vm.id.replace(cryptidAccount.did + '#', ''),
      base58Key: vm.publicKeyBase58 as string,
      isActive: wallet.publicKey?.toBase58() === vm.publicKeyBase58,
      airdropCB: requestAirDrop,
      selectCB: selectKeyCB,
      removeCB: (key, alias) => removeKeyCallback(alias)
    }))
  }, [cryptidAccount.verificationMethods, cryptidAccount.did, wallet.publicKey])

  return (
    <>
      <AddControllerModal open={addControllerDialogOpen}
                          onAdd={addControllerCallback}
                          onClose={() => setAddControllerDialogOpen(false)}
                          didPrefix={getDidPrefix()} />
      <AddKeyOrCryptidAccountModal
        open={addKeyDialogOpen}
        onClose={() => setAddKeyDialogOpen(false)}
        onAddKey={addKeyCallback}
        didPrefix={getDidPrefix()}
        currentAccountAlias={cryptidAccount.alias}
        modalType={"key"}
      />
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Cryptid Account - {cryptidAccount.alias}</h3>
          {/*<p className="mt-1 max-w-2xl text-sm text-gray-500">Personal details and application.</p>*/}
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Alias</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{cryptidAccount.alias}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Identifier</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{cryptidAccount.did}</dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Cryptid address</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{cryptidAccount.address.toBase58()}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Controlled By</dt>
              {cryptidAccount.isControlled &&
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{cryptidAccount.controlledBy}</dd>
              }
              {!cryptidAccount.isControlled &&
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2"><XCircleIcon className="h-7 w-7" aria-hidden="true" /></dd>
              }
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt>
                <div className="flex items-center">
                  <p className="text-sm font-medium text-gray-500">Keys</p>
                  <button className="ml-4" onClick={() => setAddKeyDialogOpen(true)}><PlusCircleIcon className="h-7 w-7" aria-hidden="true"/></button>
                </div>
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <KeyList items={getKeyListItems()}/>
              </dd>
            </div>
            {/*<div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">*/}
            {/*  <dt className="text-sm font-medium text-gray-500">Services</dt>*/}
            {/*  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">*/}
            {/*    Services go here.*/}
            {/*  </dd>*/}
            {/*</div>*/}
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt>
                <div className="flex items-center">
                  <p className="text-sm font-medium text-gray-500">Controllers</p>
                  <button className="ml-4" onClick={() => setAddControllerDialogOpen(true)}><PlusCircleIcon className="h-7 w-7" aria-hidden="true"/></button>
                </div>
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                Controllers go here.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </>
  )
}

type CryptidDetailsListItemInterface = {
  primary: string,
  secondary?: string
  removeCallback: (primary: string) => void
}

const CryptidDetailsListItem:React.FC<CryptidDetailsListItemInterface> = 
  ({primary, secondary, removeCallback, children}) => {
  return (
    <div className="min-w-0 max-w-3xl flex-1 flex items-center">
      <div className="text-lg flex-1 flex-shrink-0">
        {primary}
      </div>
      <div className="min-w-0 flex-auto px-4 text-gray-500">
        {secondary}
      </div>
      {children}
      <CryptidButton label='Remove' Icon={XCircleIcon} onClick={() => removeCallback(primary)}/>
      {/*<div className="min-w-0 flex-1 px-4">*/}
      {/*  <Button*/}
      {/*    variant="outlined"*/}
      {/*    color="primary"*/}
      {/*    onClick={() => removeCallback(primary)}*/}
      {/*  >*/}
      {/*    Remove*/}
      {/*  </Button>*/}
      {/*</div>*/}
    </div>
  )
}
