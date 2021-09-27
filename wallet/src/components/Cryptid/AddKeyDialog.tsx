import React, { useState } from 'react';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import TextField from '@material-ui/core/TextField';
import DialogForm from "../DialogForm";


export default function AddKeyDialog({ open, onAdd, onClose }) {
  const [address, setAddress] = useState('');


  return (
    <DialogForm
      open={open}
      onEnter={() => {
        setAddress('');
      }}
      onClose={onClose}
      onSubmit={() => onAdd({ address })}
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
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button type="submit" color="primary">
          Add
        </Button>
      </DialogActions>
    </DialogForm>
  );
}
