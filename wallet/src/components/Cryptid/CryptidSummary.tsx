import { Card, CardContent, List, ListItem, Typography } from "@material-ui/core";
import { CryptidAccount, useCryptid } from "../../utils/Cryptid/cryptid";
import Button from "@material-ui/core/Button";
import AddKeyIcon from "@material-ui/icons/VpnKeyOutlined";
import AddServiceIcon from "@material-ui/icons/RoomServiceOutlined";
import AddControllerIcon from "@material-ui/icons/SupervisorAccountOutlined";
import ListItemText from "@material-ui/core/ListItemText";
import AddKeyDialog from "./AddKeyDialog";
import React, { useCallback, useEffect, useState } from "react";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { useSnackbar } from "notistack";
import AddControllerDialog from "./AddControllerDialog";
import { useSendTransaction } from "../../utils/notifications";
import { refreshWalletPublicKeys } from "../../utils/wallet";
import {KeyIcon, UserIcon, UsersIcon} from "@heroicons/react/outline";
import {AddressLink} from "../AddressLink";
import TokenIcon from "../TokenIcon";
import {CheckCircleIcon, ChevronDownIcon, ChevronUpIcon} from "@heroicons/react/solid";

interface CryptidDetailsInterface {
  cryptidAccount: CryptidAccount
}

export const CryptidSummary = ({ cryptidAccount } : CryptidDetailsInterface) => {
  // Hooks
  const { getDidPrefix } = useCryptid();

  return (<div className="flex items-center px-4 py-4 sm:px-6">
      <div className="min-w-0 flex-1 flex items-center">
        <div className="flex-shrink-0">
          <UserIcon className="w-8"/>
        </div>
        <div className="min-w-0 flex-1 px-4">
          Account: <AddressLink publicKey={cryptidAccount.address || undefined}/>
        </div>
        <div className="min-w-0 flex-1 flex px-4 md:gap-4">
          <div className="text-sm md:block text-gray-900 flex-1">
            ID: {cryptidAccount.did}
          </div>
          <div className="flex-3">
            {cryptidAccount.isControlled && <UsersIcon className="w-4"/>}
          </div>
        </div>
      </div>
    </div>
  )
}
