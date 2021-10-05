import { Card, CardContent, List, ListItem, Typography } from "@material-ui/core";
import { CryptidAccount, useCryptid } from "../../utils/Cryptid/cryptid";
import Button from "@material-ui/core/Button";
import AddKeyIcon from "@material-ui/icons/VpnKeyOutlined";
import AddServiceIcon from "@material-ui/icons/RoomServiceOutlined";
import AddControllerIcon from "@material-ui/icons/SupervisorAccountOutlined";
import ListItemText from "@material-ui/core/ListItemText";
import AddKeyDialog from "./AddKeyDialog";
import { useCallback, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useSnackbar } from "notistack";
import AddControllerDialog from "./AddControllerDialog";

interface CryptidDetailsInterface {
  crytidAccount: CryptidAccount
}

export const CryptidDetails = ({ crytidAccount } : CryptidDetailsInterface) => {
  // Hooks
  const { getDidPrefix } = useCryptid();
  const { enqueueSnackbar } = useSnackbar();
  const [addKeyDialogOpen, setAddKeyDialogOpen] = useState(false);
  const [addControllerDialogOpen, setAddControllerDialogOpen] = useState(false);


  const addKeyCallback = useCallback(async (address: string, alias: string) => {
    console.log(`Adding key ${address}`)
    try {
      const pk = new PublicKey(address)
      await crytidAccount.addKey(pk, alias)
      setAddKeyDialogOpen(false)
    } catch (e) {
      console.warn(e);
      enqueueSnackbar(e.message, { variant: 'error' });
    }

    // success refresh the account.
    // TODO: Debug update
    console.log(JSON.stringify(crytidAccount.verificationMethods))

  }, [crytidAccount]);

  const removeKeyCallback = useCallback(async (alias: string) => {
    await crytidAccount.removeKey(alias.replace('#',''))
  }, [crytidAccount]);

  const addControllerCallback = useCallback(async (controllerDID: string) => {
    await crytidAccount.addController(controllerDID);
  }, [crytidAccount]);

  const removeControllerCallback = useCallback(async (controllerDID: string) => {
    await crytidAccount.removeController(controllerDID);
  }, [crytidAccount]);

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
