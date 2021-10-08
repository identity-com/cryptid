import {useBalanceInfo} from "../../utils/wallet";
import React, {useState} from "react";
import {serumMarkets} from "../../utils/markets";
import LoadingIndicator from "../LoadingIndicator";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import TokenIcon from "../TokenIcon";
import ListItemText from "@material-ui/core/ListItemText";
import {Typography} from "@material-ui/core";
import ExpandLess from "@material-ui/icons/ExpandLess";
import ExpandMore from "@material-ui/icons/ExpandMore";
import Collapse from "@material-ui/core/Collapse";
import {BalanceListItemDetails} from "./BalanceListItemDetails";


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
  // const classes = useStyles();
  const [open, setOpen] = useState(false);

  expandable = expandable === undefined ? true : expandable;

  if (!balanceInfo) {
    return <LoadingIndicator delay={0} />;
  }

  return (
    <>
      <ListItem button onClick={() => expandable && setOpen((open) => !open)}>
        <ListItemIcon>
          <TokenIcon
            mint={mint}
            tokenName={tokenName}
            url={tokenLogoUri}
            size={28}
          />
        </ListItemIcon>
        <div style={{ display: 'flex', flex: 1 }}>
          <ListItemText
            primary={
              <>
                {balanceFormat.format(amount / Math.pow(10, decimals))}{' '}
                {displayName}
              </>
            }
            secondary={subtitle}
            // secondaryTypographyProps={{ className: classes.address }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            {price && (
              <Typography color="textSecondary">
                {numberFormat.format(usdValue)}
              </Typography>
            )}
          </div>
        </div>
        {expandable ? open ? <ExpandLess /> : <ExpandMore /> : <></>}
      </ListItem>
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
    </>
  );
}
