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
import {KeyIcon, UserIcon, UsersIcon} from "@heroicons/react/outline";
import {AddressLink} from "../AddressLink";
import {CryptidButton} from "../balances/CryptidButton";
import {PaperAirplaneIcon, XCircleIcon} from "@heroicons/react/solid";
import * as React from "react";
import {useIsProdNetwork} from "../../utils/connection";
import {useRequestAirdrop} from "../../utils/wallet";

interface CryptidDetailsInterface {
  cryptidAccount: CryptidAccount
}

type SendTransaction = (s: Promise<TransactionSignature>, c: { onSuccess?: () => void; onError?: (err: any) => void } ) => void

// This is a hack because component will not understand prop change.
const useForceUpdate = () => {
  const [value, setValue] = useState(0); // integer state
  return () => setValue(value => value + 1); // update the state to force render
}

export const CryptidDetails = ({ cryptidAccount } : CryptidDetailsInterface) => {
  // Hooks
  const { getDidPrefix } = useCryptid();
  const forceUpdate = useForceUpdate();
  const [ sendTransaction, sending ] = useSendTransaction() as [SendTransaction, boolean]
  const [addKeyDialogOpen, setAddKeyDialogOpen] = useState(false);
  const [addControllerDialogOpen, setAddControllerDialogOpen] = useState(false);
  const isProdNetwork = useIsProdNetwork();
  const requestAirdrop = useRequestAirdrop();

  useEffect(() => {}, [cryptidAccount])

  const onSuccessUpdate = (f?: () => void) => {
    if (f) {
      f();
    }
    cryptidAccount.updateDocument().then(forceUpdate)
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

  const addControllerCallback = (controllerDID: string) => sendTransaction(cryptidAccount.addController(controllerDID), {
    onSuccess: () => onSuccessUpdate(() => setAddControllerDialogOpen(false))
  });

  const removeControllerCallback = (controllerDID: string) => sendTransaction(cryptidAccount.removeController(controllerDID), {
    onSuccess: () => onSuccessUpdate()
  });

  return (
    <>
      <AddKeyDialog
        open={addKeyDialogOpen}
        onClose={() => setAddKeyDialogOpen(false)}
        onAdd={addKeyCallback}
      />
      <AddControllerDialog
        open={addControllerDialogOpen}
        onClose={() => setAddControllerDialogOpen(false)}
        onAdd={addControllerCallback}
        didPrefix={getDidPrefix()}
      />
      <Card>
        <div className="p-3 min-w-0 flex-1 flex items-center">
          <div className="flex-shrink-0">
            <UserIcon className="h-12 w-12"/>
          </div>
          <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
            <p className="mt-2 flex items-center text-lg text-black">
              <span className="truncate">Identity</span>
            </p>
          </div>
        </div>
        { cryptidAccount.isControlled &&
        <Typography variant="h6">
          controlled by DID: {cryptidAccount.controlledBy}
        </Typography>
        }
        <CardContent>
          <div className="min-w-0 max-w-2xl flex-1 flex items-center">
            <div className="text-lg flex-1 flex-shrink-0">
              Address:
            </div>
            <div className="min-w-0 flex-1 px-4 text-gray-500">
              <AddressLink publicKey={cryptidAccount.address || undefined}/>
            </div>
          </div>
          <div className="min-w-0 max-w-2xl flex-1 flex items-center">
            <div className="text-lg flex-1 flex-shrink-0">
              DID:
            </div>
            <div className="min-w-0 flex-1 px-4 text-gray-500">
              <span className="truncate">{cryptidAccount.did}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <div className="p-3 min-w-0 flex-1 flex items-center">
          <div className="flex-shrink-0">
            <KeyIcon className="h-12 w-12"/>
          </div>
          <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
            <p className="mt-2 flex items-center text-lg text-black">
              <span className="truncate">Keys</span>
            </p>
          </div>
        </div>
        <CardContent>
          <List>
            { cryptidAccount.verificationMethods.map(vm => {
              if (!vm.publicKeyBase58) return null;
              const key = new PublicKey(vm.publicKeyBase58);
              
              return (
                <CryptidDetailsListItem primary={vm.id.replace(cryptidAccount.did + '#', '')} secondary={vm.publicKeyBase58}
                                    removeCallback={removeKeyCallback}>
                  {isProdNetwork || <CryptidButton label="Request Airdrop" Icon={PaperAirplaneIcon}
                                                   onClick={() => requestAirdrop(key)}/>}
                </CryptidDetailsListItem>
              )
            })}
          </List>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<AddKeyIcon />}
            onClick={() => setAddKeyDialogOpen(true)}
          >
            Add Key
          </Button>
        </CardContent>
      </Card>
      {/*<Card>*/}
      {/*  <CardContent>*/}
      {/*    <Typography variant="h6">*/}
      {/*      Services:*/}
      {/*    </Typography>*/}
      {/*    <Button*/}
      {/*      variant="outlined"*/}
      {/*      color="primary"*/}
      {/*      startIcon={<AddServiceIcon />}*/}
      {/*      onClick={() => alert('Add Service clicked')}*/}
      {/*    >*/}
      {/*      Add Service*/}
      {/*    </Button>*/}
      {/*  </CardContent>*/}
      {/*</Card>*/}
      <Card>
        <div className="p-3 min-w-0 flex-1 flex items-center">
          <div className="flex-shrink-0">
            <UsersIcon className="h-12 w-12"/>
          </div>
          <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
            <p className="mt-2 flex items-center text-lg text-black">
              <span className="truncate">Controllers</span>
            </p>
          </div>
        </div>
        <CardContent>
          { cryptidAccount.controllers.map(c => {
            return (
              <CryptidDetailsListItem primary={c} removeCallback={removeControllerCallback} />
            )
          })}
          <Button
            variant="outlined"
            color="primary"
            startIcon={<AddControllerIcon />}
            onClick={() => setAddControllerDialogOpen(true)}
          >
            Add Controller
          </Button>
        </CardContent>
      </Card>
    </>)
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
