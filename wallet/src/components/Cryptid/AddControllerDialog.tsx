import React, {useCallback, useEffect, useState} from 'react';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import TextField from '@material-ui/core/TextField';
import DialogForm from "../DialogForm";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import {convertToPublicKey, isValidPublicKey} from "../../utils/Cryptid/cryptid";
import {PublicKey} from "@solana/web3.js";
import {Modal} from "../modals/modal";
import {PlusCircleIcon} from "@heroicons/react/outline";

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    alignItems: 'baseline',
  },
}));

export default function AddControllerDialog({ open, onAdd, onClose, didPrefix }) {
  const [address, setAddress] = useState<PublicKey|undefined>();
  const classes = useStyles();

  const [isInvalidAddress, setIsInvalidAddress] = useState(false);
  const setValidatedAddress = useCallback((value: string) => {
    setIsInvalidAddress(!isValidPublicKey(value));
    setAddress(convertToPublicKey(value));
  }, [setAddress, setIsInvalidAddress]);

  return (
    <Modal
      show={open}
      Icon={PlusCircleIcon}
      iconClasses='text-green-500'
      okEnabled={!isInvalidAddress}
      okText='Add'
      callbacks={{
        onCancel: onClose,
        onOK: () => onAdd( didPrefix + ':' + address )
      }}
      title="Add Controller DID"
    >
        <div className={classes.root}>
          <Typography>
            {didPrefix}:
          </Typography>
          <TextField
            label="Address"
            fullWidth
            variant="outlined"
            margin="normal"
            value={address}
            onChange={(e) => setValidatedAddress(e.target.value.trim())}
          />
        </div>
    </Modal>
  );
}
