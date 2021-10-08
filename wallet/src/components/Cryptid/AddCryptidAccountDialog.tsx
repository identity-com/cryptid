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
import {Modal} from "../modals/modal";
import {PlusCircleIcon} from "@heroicons/react/outline";
import {isValidPublicKey} from "../../utils/Cryptid/cryptid";

const DEFAULT_ADDRESS = ''

export default function AddCryptidAccountDialog({ open, onAdd, onClose, didPrefix, currentAccount }) {
  const [address, setAddress] = useState(DEFAULT_ADDRESS);
  const [isInvalidAddress, setIsInvalidAddress] = useState(false);
  const [isControlled, setIsControlled] = useState(false);

  const setValidatedAddress = useCallback((value) => {
    setAddress(value);
    setIsInvalidAddress(!isValidPublicKey(value));
  }, [setAddress, setIsInvalidAddress]);

  return (
    <Modal
      show={open}
      callbacks={{
        onOK: () => onAdd(address, isControlled),
        onCancel: onClose
      }}
      title='Add Cryptid Account'
      Icon={PlusCircleIcon}
      iconClasses='text-green-500'
      okText='Add'
      okEnabled={!!address && !isInvalidAddress}
    >
      <div className="w-full">
        <div className="inline-flex -space-y-px w-full">
          <div className="self-center w-12">
            {didPrefix}
          </div>
          <input
            id="address"
            name="address"
            type="text"
            required
            className="
            w-full
            appearance-none relative block
            px-3 py-2 border border-gray-300 placeholder-gray-500
            text-gray-900 rounded-md
            focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            placeholder="Address"
            value={address}
            onChange={(e) => setValidatedAddress(e.target.value.trim())}
          />
        </div>
        <div className="inline-flex -space-y-px w-full">
          <div className="self-center w-12">
            Alias
          </div>
          <input
            id="alias"
            name="alias"
            type="text"
            required
            className="
            w-full
            appearance-none relative block
            px-3 py-2 border border-gray-300 placeholder-gray-500
            text-gray-900 rounded-md
            focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            placeholder="Alias"
            // value={address}
            // onChange={(e) => setAlias(e.target.value.trim())}
          />
        </div>
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
    </Modal>
  );
}
