import React, { useCallback, useState } from 'react';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import TextField from '@material-ui/core/TextField';
import DialogForm from "../DialogForm";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import FormGroup from "@material-ui/core/FormGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";


const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    alignItems: 'baseline',
  },
}));

const DEFAULT_ADDRESS = ''

export default function AddCryptidAccountDialog({ open, onAdd, onClose, didPrefix, currentAccount }) {
  const [address, setAddress] = useState(DEFAULT_ADDRESS);
  const [isControlled, setIsControlled] = useState(false);

  const classes = useStyles();

  return (
    <DialogForm
      open={open}
      onEnter={() => {
        setAddress(DEFAULT_ADDRESS);
      }}
      onClose={onClose}
      onSubmit={() => onAdd( address, isControlled )}
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
        { currentAccount &&
        <div>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={isControlled}
                  onChange={() => setIsControlled(!isControlled)}
                />
              }
              label={`Controlled by`}
            />
          </FormGroup>
          <Typography>
            {currentAccount}
          </Typography>
        </div> }
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
