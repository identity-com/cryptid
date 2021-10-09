import {useBalanceInfo} from "../../utils/wallet";
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
import {ClipboardIcon} from "@heroicons/react/outline";
import {CopyableAddress} from "../CopyableAddress";

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
                                      tokenSymbol,
                                      decimals,
                                      displayName,
                                      tokenLogoUri,
                                      amount,
                                      usdValue,
                                      isAssociatedToken,
                                      publicKey,
                                    }) {
  const balanceInfo = useBalanceInfo(publicKey);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);

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
      <div className="flex items-center pl-4 py-4 sm:pl-6">
        <TokenIcon
          mint={mint}
          tokenName={tokenName}
          url={tokenLogoUri}
          size={28}
        />
        <div className="min-w-0 flex-1 flex px-4 md:gap-4">
          <div className='text-sm md:text-lg flex-1'>
            {balanceFormat.format(amount / Math.pow(10, decimals))} {tokenSymbol}{
            usdValue &&
            <p className="text-sm text-gray-900">
              {numberFormat.format(usdValue)}
            </p>
          }
          </div>
        </div>
        <div className="min-w-0 flex-1 flex px-4 md:gap-4">
          <div>
            <CopyableAddress address={publicKey} label={displayName} className="text-sm md:text-lg font-medium text-indigo-600 truncate"/>
          </div>
        </div>
        <div className='inline-flex shadow-sm rounded-md'>
          <TokenButton label="Receive" Icon={ArrowCircleDownIcon} onClick={() => {setDepositDialogOpen(true)}}/>
          <TokenButton label="Send" Icon={ArrowCircleUpIcon} onClick={() => {setSendDialogOpen(true)}}/>
        </div>
      </div>
    </li>
  );
}
