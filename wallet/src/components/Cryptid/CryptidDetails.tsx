import { Card, CardContent, List, ListItem, Typography } from "@material-ui/core";
import { CryptidAccount } from "../../utils/Cryptid/cryptid";
import Button from "@material-ui/core/Button";
import AddKeyIcon from "@material-ui/icons/VpnKeyOutlined";
import AddServiceIcon from "@material-ui/icons/RoomServiceOutlined";
import AddControllerIcon from "@material-ui/icons/SupervisorAccountOutlined";
import ListItemText from "@material-ui/core/ListItemText";
import AddCustomClusterDialog from "../AddCustomClusterDialog";
import { addCustomCluster } from "../../utils/clusters";
import AddKeyDialog from "./AddKeyDialog";
import { useState } from "react";
import { PublicKey } from "@solana/web3.js";

interface CryptidDetailsInterface {
  crytidAccount: CryptidAccount
}

export const CryptidDetails = ({ crytidAccount } : CryptidDetailsInterface) => {
  const [addKeyDialogOpen, setAddKeyDialogOpen] = useState(false);


  return (
    <>
      <AddKeyDialog
        open={addKeyDialogOpen}
        onClose={() => setAddKeyDialogOpen(false)}
        onAdd={({ address }) => {
          // Cast to public Key

          // Add a key
          crytidAccount.addKey(new PublicKey(address), 'test').then(() => setAddKeyDialogOpen(false))
          // alert(`Trying to add ${address}`)

        }}
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
                <CryptidDetailsListItem primary={vm.type} secondary={vm.publicKeyBase58} />
              )
            })

            }
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
      <Card>
        <CardContent>
          <Typography variant="h6">
            Services:
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<AddServiceIcon />}
            onClick={() => alert('Add Service clicked')}
          >
            Add Service
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6">
            Controller:
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<AddControllerIcon />}
            onClick={() => alert('Add Controller clicked')}
          >
            Add Controller
          </Button>
        </CardContent>
      </Card>
    </>)
}

interface CryptidDetailsListItemInterface {
  primary: string,
  secondary: string | undefined
}

const CryptidDetailsListItem = ({primary, secondary} : CryptidDetailsListItemInterface) => {
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
      </ListItem>
  )
}
