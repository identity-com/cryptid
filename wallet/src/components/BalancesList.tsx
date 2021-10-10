import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  useBalanceInfo,
} from '../utils/wallet';
import { findAssociatedTokenAddress } from '../utils/tokens';
import LoadingIndicator from './LoadingIndicator';
import { abbreviateAddress, useIsExtensionWidth } from '../utils/utils';
import { serumMarkets, priceStore } from '../utils/markets';
import { useConnection } from '../utils/connection';
import {useCryptid, useCryptidAccountPublicKeys} from "../utils/Cryptid/cryptid";
import BalanceListView from "./balances/BalanceListView";
import {PublicKey} from "@solana/web3.js";
import { BalanceListItemView } from './balances/BalanceListItemView';

// Aggregated $USD values of all child BalanceListItems child components.
//
// Values:
// * undefined => loading.
// * null => no market exists.
// * float => done.
//
// For a given set of publicKeys, we know all the USD values have been loaded when
// all of their values in this object are not `undefined`.
const usdValues = {};

// Calculating associated token addresses is an asynchronous operation, so we cache
// the values so that we can quickly render components using them. This prevents
// flickering for the associated token fingerprint icon.
const associatedTokensCache = {};

function fairsIsLoaded(publicKeys) {
  return (
    publicKeys.filter((pk) => usdValues[pk.toString()] !== undefined).length ===
    publicKeys.length
  );
}

export default function BalancesList() {
  const { selectedCryptidAccount } = useCryptid()
  const [publicKeys] = useCryptidAccountPublicKeys(selectedCryptidAccount);

  // Dummy var to force rerenders on demand.
  const [, setForceUpdate] = useState(false);

  // Memoized callback and component for the `BalanceListItems`.
  //
  // The `BalancesList` fetches data, e.g., fairs for tokens using React hooks
  // in each of the child `BalanceListItem` components. However, we want the
  // parent component, to aggregate all of this data together, for example,
  // to show the cumulative USD amount in the wallet.
  //
  // To achieve this, we need to pass a callback from the parent to the chlid,
  // so that the parent can collect the results of all the async network requests.
  // However, this can cause a render loop, since invoking the callback can cause
  // the parent to rerender, which causese the child to rerender, which causes
  // the callback to be invoked.
  //
  // To solve this, we memoize all the `BalanceListItem` children components.
  const setUsdValuesCallback = useCallback(
    (publicKey, usdValue) => {
      if (usdValues[publicKey.toString()] !== usdValue) {
        usdValues[publicKey.toString()] = usdValue;
        if (fairsIsLoaded(publicKeys)) {
          setForceUpdate((forceUpdate) => !forceUpdate);
        }
      }
    },
    [publicKeys],
  );
  const balanceListItemsMemo = useMemo(() => {
    return publicKeys.map((pk) => {
      return React.memo((props) => {
        return (
          <BalanceListItem
            key={pk.toString()}
            publicKey={pk}
            setUsdValue={setUsdValuesCallback}
          />
        );
      });
    });
  }, [publicKeys, setUsdValuesCallback]);

  return (
    <BalanceListView>
      {balanceListItemsMemo.map(Memoized =>
        <Memoized />
      )}
    </BalanceListView>
  );
}

export function BalanceListItem({ publicKey, setUsdValue }) {
  const { selectedCryptidAccount } = useCryptid();
  const balanceInfo = useBalanceInfo(publicKey);
  const connection = useConnection();
  const isExtensionWidth = useIsExtensionWidth();
  const [, setForceUpdate] = useState(false);
  // Valid states:
  //   * undefined => loading.
  //   * null => not found.
  //   * else => price is loaded.
  const [price, setPrice] = useState<number|undefined>(undefined);
  
  useEffect(() => {
    console.log('UseEffect in BalanceListItem')
    if (balanceInfo) {
      if (balanceInfo.tokenSymbol) {
        const coin = balanceInfo.tokenSymbol.toUpperCase();
        // Don't fetch USD stable coins. Mark to 1 USD.
        if (coin === 'USDT' || coin === 'USDC') {
          setPrice(1);
        }
        // A Serum market exists. Fetch the price.
        else if (serumMarkets[coin]) {
          let m = serumMarkets[coin];
          priceStore
            .getPrice(connection, m.name)
            .then((price) => {
              setPrice(price);
            })
            .catch((err) => {
              console.error(err);
              setPrice(undefined);
            });
        }
        // No Serum market exists.
        else {
          setPrice(undefined);
        }
      }
      // No token symbol so don't fetch market data.
      else {
        setPrice(undefined);
      }
    }
  }, [price, balanceInfo, connection]);

  if (!balanceInfo) {
    return <LoadingIndicator delay={0} />;
  }

  let {
    amount,
    decimals,
    mint,
    tokenName,
    tokenSymbol,
    tokenLogoUri,
  } = balanceInfo;

  const mintAddressName = mint ? abbreviateAddress(mint) : 'unknown'
  tokenName = tokenName ?? mintAddressName;
  let displayName;
  if (isExtensionWidth) {
    displayName = tokenSymbol ?? tokenName;
  } else {
    displayName = tokenName + (tokenSymbol ? ` (${tokenSymbol})` : '');
  }

  // Fetch and cache the associated token address.
  if (selectedCryptidAccount && selectedCryptidAccount.address && mint) {
    if (
      associatedTokensCache[selectedCryptidAccount.address.toString()] === undefined ||
      associatedTokensCache[selectedCryptidAccount.address.toString()][mint.toString()] ===
        undefined
    ) {
      findAssociatedTokenAddress(selectedCryptidAccount.address, mint).then((assocTok) => {
        let walletAccounts = Object.assign(
          {},
          // @ts-ignore
          associatedTokensCache[selectedCryptidAccount.address.toString()],
        );
        walletAccounts[(mint as PublicKey).toString()] = assocTok;
        // @ts-ignore
        associatedTokensCache[selectedCryptidAccount.address.toString()] = walletAccounts;
        if (assocTok.equals(publicKey)) {
          // Force a rerender now that we've cached the value.
          setForceUpdate((forceUpdate) => !forceUpdate);
        }
      });
    }
  }

  // undefined => not loaded.
  let isAssociatedToken = mint ? undefined : false;
  if (
    selectedCryptidAccount &&
    selectedCryptidAccount.address &&
    mint &&
    associatedTokensCache[selectedCryptidAccount.address.toString()]
  ) {
    let acc =
      associatedTokensCache[selectedCryptidAccount.address.toString()][mint.toString()];
    if (acc) {
      if (acc.equals(publicKey)) {
        isAssociatedToken = true;
      } else {
        isAssociatedToken = false;
      }
    }
  }

  
  let usdValue;
  if (amount !== undefined && price) {
    usdValue = ((amount / Math.pow(10, decimals)) * price).toFixed(2)
  }
  if (setUsdValue && usdValue) {
    setUsdValue(publicKey, parseFloat(usdValue));
  }

  return (
    <BalanceListItemView
      mint={mint}
      tokenName={tokenName}
      tokenSymbol={tokenSymbol}
      decimals={decimals}
      displayName={displayName}
      tokenLogoUri={tokenLogoUri}
      amount={amount}
      usdValue={usdValue}
      isAssociatedToken={isAssociatedToken}
      publicKey={publicKey}
    />
  );
}
