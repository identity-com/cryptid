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
import { refreshWalletPublicKeys } from "../../utils/wallet";

interface CryptidDetailsInterface {
  crytidAccount: CryptidAccount
  setSelectedCryptidAccount: (c: CryptidAccount) => void
}

type SendTransaction = (s: Promise<TransactionSignature>, c: { onSuccess?: () => void; onError?: (err: any) => void } ) => void

// This is a hack because component will not understand prop change.
const useForceUpdate = () => {
  const [value, setValue] = useState(0); // integer state
  return () => setValue(value => value + 1); // update the state to force render
}

export const CryptidDetails = ({ crytidAccount } : CryptidDetailsInterface) => {
  // Hooks
  const { getDidPrefix } = useCryptid();
  const forceUpdate = useForceUpdate();
  const [ sendTransaction, sending ] = useSendTransaction() as [SendTransaction, boolean]
  const [addKeyDialogOpen, setAddKeyDialogOpen] = useState(false);
  const [addControllerDialogOpen, setAddControllerDialogOpen] = useState(false);

  useEffect(() => {}, [crytidAccount])

  const onSuccessUpdate = (f?: () => void) => {
    if (f) {
      f();
    }
    crytidAccount.updateDocument().then(forceUpdate)
  }

  const addKeyCallback = (address: string, alias: string) => {
    const pk = new PublicKey(address)
    sendTransaction(crytidAccount.addKey(pk, alias), {
      onSuccess: () => onSuccessUpdate(() => setAddKeyDialogOpen(false))
    });
  }

  const removeKeyCallback = (alias: string) => sendTransaction(crytidAccount.removeKey(alias.replace('#','')), {
    onSuccess: () => onSuccessUpdate()
  });

  const addControllerCallback = (controllerDID: string) => sendTransaction(crytidAccount.addController(controllerDID), {
    onSuccess: () => onSuccessUpdate(() => setAddControllerDialogOpen(false))
  });

  const removeControllerCallback = (controllerDID: string) => sendTransaction(crytidAccount.removeController(controllerDID), {
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
        <Typography variant="h6">
          DID: {crytidAccount.did}
        </Typography>
        { crytidAccount.isControlled &&
          <Typography variant="h6">
              controlled by DID: {crytidAccount.controlledBy}
          </Typography>
        }
        <CardContent>
          <Typography variant="h6">
            Keys:
          </Typography>
          <List>
            { crytidAccount.verificationMethods.map(vm => {
              return (
                <CryptidDetailsListItem primary={vm.id.replace(crytidAccount.did, '')} secondary={vm.publicKeyBase58}
                                        removeCallback={removeKeyCallback}/>
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
        <CardContent>
          <Typography variant="h6">
            Controller:
          </Typography>
          { crytidAccount.controllers.map(c => {
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

interface CryptidDetailsListItemInterface {
  primary: string,
  secondary?: string
  removeCallback: (primary: string) => void
}

const CryptidDetailsListItem = ({primary, secondary, removeCallback} : CryptidDetailsListItemInterface) => {
  return (
      <ListItem>
        <div style={{ display: 'flex', flex: 1 }}>
          <ListItemText
            primary={
              <>
                {primary}
              </>
            }
            secondary={secondary}
          />
        </div>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => removeCallback(primary)}
        >
          Remove
        </Button>
      </ListItem>
  )
}
