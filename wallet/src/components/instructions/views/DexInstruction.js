import React from 'react';
import Typography from '@material-ui/core/Typography';
import LabelValue from './LabelValue';
import {useCryptid, useCryptidAccountPublicKeys} from "../../../utils/Cryptid/cryptid";
import InstructionView from "../layout/InstructionView";

const TYPE_LABELS = {
  cancelOrder: 'Cancel order',
  newOrder: 'Place order',
  settleFunds: 'Settle funds',
  matchOrders: 'Match orders',
};

const DATA_LABELS = {
  side: { label: 'Side', address: false },
  orderId: { label: 'Order Id', address: false },
  limit: { label: 'Limit', address: false },
  basePubkey: { label: 'Base wallet', address: true },
  quotePubkey: { label: 'Quote wallet', address: true },
};

export default function DexInstruction({ instruction, onOpenAddress, index, expanded, setExpanded }) {
  const {selectedCryptidAccount} = useCryptid();
  const [publicKeys] = useCryptidAccountPublicKeys();
  const { type, data, market, marketInfo } = instruction;

  const marketLabel =
    (marketInfo &&
      marketInfo?.name + (marketInfo?.deprecated ? ' (deprecated)' : '')) ||
    market?._decoded?.ownAddress?.toBase58() ||
    'Unknown';

  const getAddressValue = (address) => {
    const isOwned = publicKeys.some((ownedKey) => ownedKey.equals(address));
    const isOwner = address.equals(selectedCryptidAccount.address);
    return isOwner
      ? 'This wallet'
      : (isOwned ? '(Owned) ' : '') + address?.toBase58();
  };
  
  return (
    <InstructionView index={index} expanded={expanded} setExpanded={setExpanded} title={TYPE_LABELS[type]} instruction={instruction}>
    <>
      <Typography
        variant="subtitle1"
        style={{ fontWeight: 'bold' }}
        gutterBottom
      >
        {TYPE_LABELS[type]}
      </Typography>
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
      {data &&
        Object.entries(data).map(([key, value]) => {
          const dataLabel = DATA_LABELS[key];
          if (!dataLabel) {
            return null;
          }
          const { label, address } = dataLabel;
          return (
            <LabelValue
              key={key}
              label={label + ''}
              value={address ? getAddressValue(value) : value + ''}
              link={address}
              onClick={() => address && onOpenAddress(value?.toBase58())}
            />
          );
        })}
    </>
    </InstructionView>
  );
}
