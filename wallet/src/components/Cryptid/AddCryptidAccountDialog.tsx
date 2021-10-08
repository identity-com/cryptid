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
import CryptidTypeSelector from "./CryptidTypeSelector";

export default function AddCryptidAccountDialog({ open, onAdd, onClose, didPrefix, currentAccount }) {
  const [address, setAddress] = useState('');
  const [alias, setAlias] = useState('');

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
        onOK: () => onAdd(address, alias, isControlled),
        onCancel: onClose
      }}
      title='Add Cryptid Account'
      Icon={PlusCircleIcon}
      iconClasses='text-green-500'
      okText='Add'
      okEnabled={!!address && !isInvalidAddress && !!alias}
    >
      <div className="w-full">
        <div className="space-y-8 divide-y divide-gray-200 sm:space-y-5">
          <div>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">


              <div className="sm:col-span-6">
                <label htmlFor="street-address" className="block text-sm font-medium text-gray-700">
                  Alias
                </label>
                <div className="mt-1">
                  <input type="text" name="alias" id="alias" autoComplete="alias"
                         className="px-3 py-2 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 border rounded-md"
                         placeholder="Alias"
                         value={alias}
                         onChange={(e) => setAlias(e.target.value.trim())}
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="street-address" className="block text-sm font-medium text-gray-700">
                  Type
                </label>
                <div className="mt-1">
                  <CryptidTypeSelector />
                </div>
              </div>


              <div className="sm:col-span-6">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Cryptid Account
                </label>
                <div className="mt-1 flex rounded-md shadow-sm w-full">
                  <span
                    className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                    {didPrefix}:
                  </span>
                  <input type="text" name="address" id="address" autoComplete="address"
                         className="flex-1 px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full min-w-0 rounded-none rounded-r-md border sm:text-sm border-gray-300"
                         placeholder="Address"
                         value={address}
                         onChange={(e) => setValidatedAddress(e.target.value.trim())}
                  />
                </div>
              </div>
          </div>
      </div>
      {/*{ currentAccount &&*/}
      {/*<div>*/}
      {/*  <FormGroup>*/}
      {/*    <FormControlLabel*/}
      {/*      control={*/}
      {/*        <Switch*/}
      {/*          checked={isControlled}*/}
      {/*          onChange={() => setIsControlled(!isControlled)}*/}
      {/*        />*/}
      {/*      }*/}
      {/*      label={`Controlled by`}*/}
      {/*    />*/}
      {/*  </FormGroup>*/}
      {/*  <Typography>*/}
      {/*    {currentAccount}*/}
      {/*  </Typography>*/}
      {/*</div> }*/}
        </div>
      </div>
    </Modal>
  );
}
