import { useWalletSelector } from "../utils/wallet";

import Hidden from "@material-ui/core/Hidden";
import Button from "@material-ui/core/Button";
import Tooltip from "@material-ui/core/Tooltip";
import IconButton from "@material-ui/core/IconButton";
import AccountIcon from "@material-ui/icons/AccountCircle";
import Menu from "@material-ui/core/Menu";
import Divider from "@material-ui/core/Divider";
import MenuItem from "@material-ui/core/MenuItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import UsbIcon from "@material-ui/icons/Usb";
import AddIcon from "@material-ui/icons/Add";
import ImportExportIcon from "@material-ui/icons/ImportExport";
import ExitToApp from "@material-ui/icons/ExitToApp";
import React, { useState } from "react";
import { useStyles } from "./NavigationFrame";
import CheckIcon from "@material-ui/icons/Check";
import Typography from "@material-ui/core/Typography";
import { useCryptid } from "../utils/cryptid";

export const CryptidSelector = () => {
  const { cryptidAccounts } = useCryptid()

  const [anchorEl, setAnchorEl] = useState<Element | null>(null);
  const classes = useStyles();

  if (cryptidAccounts.length === 0) {
    return null;
  }
  return (
    <>
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
        <Tooltip title="Select Account" arrow>
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
        {cryptidAccounts.map((account) => (
          <CryptidListItem
            account={account}
            classes={classes}
            setAnchorEl={setAnchorEl}
            // setWalletSelector={setWalletSelector}
          />
        ))}
      </Menu>
    </>
  );
}

const CryptidListItem = ({ account, classes, setAnchorEl }) => {
  return (
    <MenuItem
      key={account.did}
      onClick={() => {
        setAnchorEl(null);
        // setWalletSelector(account.selector);
      }}
      selected={account.isSelected}
      component="div"
    >
      {/*<ListItemIcon className={classes.menuItemIcon}>*/}
      {/*  {account.isSelected ? <CheckIcon fontSize="small" /> : null}*/}
      {/*</ListItemIcon>*/}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Typography>{account.did}</Typography>
        <Typography color="textSecondary">
          {account.did}
        </Typography>
      </div>
    </MenuItem>
  );
}
