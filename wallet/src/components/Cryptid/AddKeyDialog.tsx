import React, { useState } from 'react';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import TextField from '@material-ui/core/TextField';
import DialogForm from "../DialogForm";


const DEFAULT_ADDRESS = ''
const DEFAULT_ALIAS = 'keyX'

export default function AddKeyDialog({ open, onAdd, onClose }) {
  const [address, setAddress] = useState(DEFAULT_ADDRESS);
  const [alias, setAlias] = useState(DEFAULT_ALIAS);



  return (
    <DialogForm
      open={open}
      onEnter={() => {
        setAddress(DEFAULT_ADDRESS);
        setAlias(DEFAULT_ALIAS)
      }}
      onClose={onClose}
      onSubmit={() => onAdd( address, alias )}
      fullWidth
    >
      <DialogTitle>Add Ed25519 Key to DID.</DialogTitle>
      <DialogContent style={{ paddingTop: 16 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
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
      <DialogContent style={{ paddingTop: 16 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <TextField
            label="Alias"
            fullWidth
            variant="outlined"
            margin="normal"
            value={alias}
            onChange={(e) => setAlias(e.target.value.trim())}
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
