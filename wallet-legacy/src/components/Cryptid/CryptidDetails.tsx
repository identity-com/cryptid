import { CryptidAccount, useCryptid } from "../../utils/Cryptid/cryptid";
import { useCallback, useState } from "react";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { useSendTransaction } from "../../utils/notifications";
import {CryptidButton} from "../balances/CryptidButton";
import { CheckCircleIcon, PlusCircleIcon, XCircleIcon } from "@heroicons/react/outline";
import * as React from "react";
import { useRequestAirdrop, WalletInterface } from "../../utils/wallet";
import AddControllerModal from "../modals/AddControllerModal";
import AddKeyOrCryptidAccountModal from "./AddKeyOrCryptidAccountModal";
import KeyList, { KeyListItem } from "./KeyList";
import ControllerList, { ControllerListItem } from "./ControllerList";
import {any} from 'ramda';
import {VerificationMethod} from 'did-resolver';

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    // intro a short sleep
    sleep(500).then(cryptidAccount.updateDocument).then(forceUpdate)
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

  const vmToKey = useCallback((vm: VerificationMethod, capabilityInvocation: boolean | ((alias: string) => boolean)) => {
    const alias = vm.id.replace(cryptidAccount.did + '#', '');
    return {
      alias,
      base58Key: vm.publicKeyBase58 as string,
      isActive: wallet.publicKey?.toBase58() === vm.publicKeyBase58,
      capabilityInvocation: typeof capabilityInvocation === 'boolean' ? capabilityInvocation : capabilityInvocation(alias),
      airdropCB: requestAirDrop,
      selectCB: selectKeyCB,
      removeCB: (key, alias) => removeKeyCallback(alias)
    };
  }, [cryptidAccount.did, wallet.publicKey])

  const getKeyListItems = useCallback((): KeyListItem[] => {
    const capabilityInvocations = cryptidAccount.capabilityInvocations;
    const capabilityInvocationStrings = capabilityInvocations
      .filter((ci: string | VerificationMethod): ci is string => typeof ci === 'string')
      .map((string) => string.replace(cryptidAccount.did + '#', ''));

    return cryptidAccount.verificationMethods
      .filter(vm => !!vm.publicKeyBase58)
      .map(vm => vmToKey(vm, (alias) => any(
        (invocation) => invocation === alias,
          capabilityInvocationStrings
        ))
      )
      .concat(capabilityInvocations
        .filter((ci: string | VerificationMethod): ci is VerificationMethod => typeof ci !== 'string')
        .map((vm) => vmToKey(vm, true))
      );
  }, [cryptidAccount.verificationMethods, cryptidAccount.did, cryptidAccount.capabilityInvocations, vmToKey])

  const getControllerListItems = useCallback((): ControllerListItem[] => {
    return cryptidAccount.controllers.map(c => ({
      controllerDid: c,
      removeCB: (c) => removeControllerCallback(c)
    }))
  }, [cryptidAccount.controllers])

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
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2" data-testid="didAddress">{cryptidAccount.did}</dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Cryptid address</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2" data-testid="cryptidWalletAddress">{cryptidAccount.address.toBase58()}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Controlled By</dt>
              {cryptidAccount.isControlled &&
                <dd className="mt-1">
                  <div className="inline-flex items-center">
                    <p className="text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {cryptidAccount.baseAccount().alias}
                    </p>
                    {cryptidAccount.controllerMatches && <CheckCircleIcon className="ml-1 text-green-500 w-6 h-6"/>}
                    {!cryptidAccount.controllerMatches && <XCircleIcon className="ml-1 text-red-500 w-6 h-6"/>}
                  </div>
                </dd>
              }
              {!cryptidAccount.isControlled &&
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">Self-Controlled</dd>
              }
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt>
                <div className="flex items-center">
                  <p className="text-sm font-medium text-gray-500">Keys</p>
                  <button className="ml-4" onClick={() => setAddKeyDialogOpen(true)}><PlusCircleIcon className="h-7 w-7" data-testid="keysPlusCircleIcon" aria-hidden="true"/></button>
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
                  <button className="ml-4" onClick={() => setAddControllerDialogOpen(true)}><PlusCircleIcon className="h-7 w-7" data-testid="controllersPlusCircleIcon" aria-hidden="true"/></button>
                </div>
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <ControllerList items={getControllerListItems()}/>
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
