import {useBalanceInfo, useWallet} from "../../utils/wallet";
import {useConnection} from "../../utils/connection";
import React, {useEffect, useState} from "react";
import {abbreviateAddress, useIsExtensionWidth} from "../../utils/utils";
import {priceStore, serumMarkets} from "../../utils/markets";
import LoadingIndicator from "../LoadingIndicator";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import TokenIcon from "../TokenIcon";
import Collapse from "@material-ui/core/Collapse";
import {BalanceListItemDetails} from "./BalanceListItemDetails";
import {
  CheckCircleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowCircleUpIcon, ArrowCircleDownIcon
} from "@heroicons/react/solid";
import {TokenButton} from "./TokenButton";
import SendDialog from "../SendDialog";
import DepositDialog from "../DepositDialog";


const balanceFormat = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
  useGrouping: true,
});

const numberFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function BalanceListItemView({
                                      mint,
                                      tokenName,
                                      decimals,
                                      displayName,
                                      subtitle,
                                      tokenLogoUri,
                                      amount,
                                      price,
                                      usdValue,
                                      isAssociatedToken,
                                      publicKey,
                                      expandable,
                                    }) {
  const balanceInfo = useBalanceInfo(publicKey);
  const [open, setOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);

  expandable = expandable === undefined ? true : expandable;

  if (!balanceInfo) {
    return <LoadingIndicator delay={0} />;
  }

  return (
    <li key={mint}>
      <SendDialog
        open={sendDialogOpen}
        onClose={() => setSendDialogOpen(false)}
        balanceInfo={balanceInfo}
        publicKey={publicKey}
      />
      <DepositDialog
        open={depositDialogOpen}
        onClose={() => setDepositDialogOpen(false)}
        balanceInfo={balanceInfo}
        publicKey={publicKey}
        // swapInfo={swapInfo}
        isAssociatedToken={isAssociatedToken}
      />
        <div className="flex items-center px-4 py-4 sm:px-6">
          <div className="min-w-0 flex-1 flex items-center">
            <div className="flex-shrink-0">
              <TokenIcon
                mint={mint}
                tokenName={tokenName}
                url={tokenLogoUri}
                size={28}
              />
            </div>
            <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
              <div>
                {balanceFormat.format(amount / Math.pow(10, decimals))}{' '}
                <p className="text-sm font-medium text-indigo-600 truncate">{displayName}</p>
              </div>
              <div className="hidden md:block">
                <div>
                  <p className="text-sm text-gray-900">
                    {numberFormat.format(usdValue)}
                  </p>
                  <p className="mt-2 flex items-center text-sm text-gray-500">
                    <CheckCircleIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-green-400" aria-hidden="true"/>
                    {publicKey.toString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className='inline-flex shadow-sm rounded-md'>
            <TokenButton label="Receive" Icon={ArrowCircleDownIcon} onClick={() => {setDepositDialogOpen(true)}}/>
            <TokenButton label="Send" Icon={ArrowCircleUpIcon} onClick={() => {setSendDialogOpen(true)}}/>
          </div>
          <div>
            {open ?
              <ChevronUpIcon className="h-5 w-5 text-gray-400" aria-hidden="true" onClick={() => setOpen(!open)}/>
              :
              <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" onClick={() => setOpen(!open)}/>
            }
          </div>
        </div>
      {expandable && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <BalanceListItemDetails
            isAssociatedToken={isAssociatedToken}
            publicKey={publicKey}
            serumMarkets={serumMarkets}
            balanceInfo={balanceInfo}
          />
        </Collapse>
      )}
    </li>
  );
}
