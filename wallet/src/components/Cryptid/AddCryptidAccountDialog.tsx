import React, { useCallback, useState } from 'react';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import TextField from '@material-ui/core/TextField';
import DialogForm from "../DialogForm";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";


const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    alignItems: 'baseline',
  },
}));

const DEFAULT_ADDRESS = ''

export default function AddCryptidAccountDialog({ open, onAdd, onClose, didPrefix }) {
  const [address, setAddress] = useState(DEFAULT_ADDRESS);
  const classes = useStyles();

  return (
    <DialogForm
      open={open}
      onEnter={() => {
        setAddress(DEFAULT_ADDRESS);
      }}
      onClose={onClose}
      onSubmit={() => onAdd( address )}
      fullWidth
    >
      <DialogTitle>Add Cryptid Account</DialogTitle>
      <DialogContent style={{ paddingTop: 16 }}>
        <div className={classes.root}>
          <Typography>
            {didPrefix}
          </Typography>
          <TextField
            label="Address"
            fullWidth
            variant="outlined"
            margin="normal"
            value={address}
            onChange={(e) => setAddress(e.target.value.trim())}
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button type="submit" color="primary">
          Add
        </Button>
      </DialogActions>
    </DialogForm>
  );
}
