import Hidden from "@material-ui/core/Hidden";
import Button from "@material-ui/core/Button";
import Tooltip from "@material-ui/core/Tooltip";
import IconButton from "@material-ui/core/IconButton";
import AccountIcon from "@material-ui/icons/AccountCircle";
import Menu from "@material-ui/core/Menu";
import Divider from "@material-ui/core/Divider";
import MenuItem from "@material-ui/core/MenuItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import AddIcon from "@material-ui/icons/Add";
import React, { useCallback, useState } from "react";
import CheckIcon from "@material-ui/icons/Check";
import Typography from "@material-ui/core/Typography";
import { useCryptid } from "../../utils/Cryptid/cryptid";
import AddCryptidAccountDialog from "./AddCryptidAccountDialog";
import { makeStyles } from '@material-ui/core/styles';

export const useStyles = makeStyles((theme) => ({
  content: {
    flexGrow: 1,
    paddingBottom: theme.spacing(3),
    // @ts-ignore
    [theme.breakpoints.up(theme.ext)]: {
      paddingTop: theme.spacing(3),
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(1),
    },
  },
  title: {
    flexGrow: 1,
  },
  button: {
    marginLeft: theme.spacing(1),
  },
  menuItemIcon: {
    minWidth: 32,
  },
  badge: {
    backgroundColor: theme.palette.success.main,
    // @ts-ignore
    color: theme.palette.text.main,
    height: 16,
    width: 16,
  },
}));

export const AddCryptidButton = () => {
  return (
    <Button
      color="inherit"
      onClick={(e) => console.log('Clicked AddCryptid')}>
      Cryptid
    </Button>
  )
}

export const CryptidSelector = () => {
  const { cryptidAccounts, selectedCryptidAccount, setSelectedCryptidAccount, addCryptidAccount, getDidPrefix } = useCryptid()

  const [anchorEl, setAnchorEl] = useState<Element | null>(null);
  const [addCryptidAccountDialogOpen, setCryptidAccountDialogOpen] = useState(false);

  const classes = useStyles();

  const onAdd = useCallback(async (address: string, alias: string, isControlled: boolean) => {
    let parent;
    if (isControlled && selectedCryptidAccount) {
      parent = selectedCryptidAccount
    }

    addCryptidAccount(address, alias, parent)
    setCryptidAccountDialogOpen(false)
  },[selectedCryptidAccount, addCryptidAccount])

  if (cryptidAccounts.length === 0) {
    return null;
  }
  return (
    <>
      <AddCryptidAccountDialog
        open={addCryptidAccountDialogOpen}
        onClose={() => setCryptidAccountDialogOpen(false)}
        onAdd={onAdd}
        didPrefix={getDidPrefix()}
        currentAccountDid={selectedCryptidAccount?.did}
      />
      <Hidden xsDown>
        <Button
          color="inherit"
          onClick={(e) => setAnchorEl(e.target as Element)}
          className={classes.button}
        >
          Cryptid
        </Button>
      </Hidden>
      <Hidden smUp>
        <Tooltip title="Select Cryptid Account" arrow>
          <IconButton color="inherit" onClick={(e) => setAnchorEl(e.target as Element)}>
            <AccountIcon />
          </IconButton>
        </Tooltip>
      </Hidden>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        getContentAnchorEl={null}
      >
        {cryptidAccounts.map((cryptidAccount) => (
          <CryptidListItem
            cryptidAccount={cryptidAccount}
            isSelected={cryptidAccount.did === selectedCryptidAccount?.did}
            classes={classes}
            setAnchorEl={setAnchorEl}
            setSelectedCryptidAccount={setSelectedCryptidAccount}
          />
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            setCryptidAccountDialogOpen(true);
          }}
        >
          <ListItemIcon className={classes.menuItemIcon}>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          Add Cryptid Account
        </MenuItem>
      </Menu>
    </>
  );
}

const CryptidListItem = ({ cryptidAccount, isSelected, classes, setAnchorEl, setSelectedCryptidAccount }) => {
  return (
    <MenuItem
      key={cryptidAccount.did}
      onClick={() => {
        setAnchorEl(null);
        setSelectedCryptidAccount(cryptidAccount);
      }}
      selected={cryptidAccount.isSelected}
      component="div"
    >
      <ListItemIcon className={classes.menuItemIcon}>
        {isSelected ? <CheckIcon fontSize="small" /> : null}
      </ListItemIcon>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Typography>{cryptidAccount.did}</Typography>
        <Typography color="textSecondary">
          {cryptidAccount.did}
        </Typography>
      </div>
    </MenuItem>
  );
}
