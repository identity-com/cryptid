import React from 'react';
import LabelValue from './LabelValue';
import {useCryptid} from "../../../utils/Cryptid/cryptid";
import InstructionView from "../layout/InstructionView";

export default function Neworder({ instruction, onOpenAddress, v3 = false, index, expanded, setExpanded }) {
  const { selectedCryptidAccount } = useCryptid();
  const { data, market, marketInfo } = instruction;
  const marketLabel =
    (marketInfo &&
      marketInfo?.name + (marketInfo?.deprecated ? ' (deprecated)' : '')) ||
    market?._decoded?.ownAddress?.toBase58() ||
    'Unknown';

  const getAddressValue = (address) => {
    const isOwner = address.equals(selectedCryptidAccount.address);
    return isOwner ? 'This wallet' : address?.toBase58() || 'Unknown';
  };

  const { side, limitPrice, orderType, ownerPubkey } = data;
  const maxQuantity = v3 ? data.maxBaseQuantity : data.maxQuantity;
  return (
    <InstructionView index={index} expanded={expanded} setExpanded={setExpanded} title='Place an order' instruction={instruction}>
    <>
      <LabelValue
        label="Market"
        value={marketLabel}
        link={true}
        onClick={() =>
          onOpenAddress(
            (marketInfo?.address || market?._decoded?.ownAddress)?.toBase58(),
          )
        }
      />
      <LabelValue
        label="Side"
        value={side.charAt(0).toUpperCase() + side.slice(1)}
      />
      <LabelValue
        label="Price"
        value={market?.priceLotsToNumber(limitPrice) || '' + limitPrice}
      />
      <LabelValue
        label="Quantity"
        value={market?.baseSizeLotsToNumber(maxQuantity) || '' + maxQuantity}
      />
      <LabelValue
        label="Type"
        value={orderType.charAt(0).toUpperCase() + orderType.slice(1)}
      />
      <LabelValue
        label="Owner"
        link={ownerPubkey}
        value={ownerPubkey ? getAddressValue(ownerPubkey) : ownerPubkey}
        onOpenAddress={() =>
          ownerPubkey && onOpenAddress(ownerPubkey?.toBase58())
        }
      />
    </>
    </InstructionView>
  );
}
