import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  useBalanceInfo,
  useWallet,
  useWalletSelector,
} from '../utils/wallet';
import { findAssociatedTokenAddress } from '../utils/tokens';
import LoadingIndicator from './LoadingIndicator';
import { abbreviateAddress, useIsExtensionWidth } from '../utils/utils';
import { serumMarkets, priceStore } from '../utils/markets';
import { useConnection } from '../utils/connection';
import {useCryptid, useCryptidWalletPublicKeys} from "../utils/Cryptid/cryptid";
import BalanceListView from "./balances/BalanceListView";
import {PublicKey} from "@solana/web3.js";
import { BalanceListItemView } from './balances/BalanceListItemView2';

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
  const [publicKeys] = useCryptidWalletPublicKeys(selectedCryptidAccount);

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
            expandable={true}
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

export function BalanceListItem({ publicKey, expandable, setUsdValue }) {
  const wallet = useWallet();
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

  expandable = expandable === undefined ? true : expandable;

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
  if (wallet && wallet.publicKey && mint) {
    if (
      associatedTokensCache[wallet.publicKey.toString()] === undefined ||
      associatedTokensCache[wallet.publicKey.toString()][mint.toString()] ===
        undefined
    ) {
      findAssociatedTokenAddress(wallet.publicKey, mint).then((assocTok) => {
        let walletAccounts = Object.assign(
          {},
          associatedTokensCache[wallet.publicKey.toString()],
        );
        walletAccounts[(mint as PublicKey).toString()] = assocTok;
        associatedTokensCache[wallet.publicKey.toString()] = walletAccounts;
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
    wallet &&
    wallet.publicKey &&
    mint &&
    associatedTokensCache[wallet.publicKey.toString()]
  ) {
    let acc =
      associatedTokensCache[wallet.publicKey.toString()][mint.toString()];
    if (acc) {
      if (acc.equals(publicKey)) {
        isAssociatedToken = true;
      } else {
        isAssociatedToken = false;
      }
    }
  }

  const subtitle =
    isExtensionWidth || !publicKey.equals(balanceInfo.owner) ? undefined : (
      <div style={{ display: 'flex', height: '20px', overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          DOA:  {publicKey.toBase58()}
        </div>
      </div>
    );

  let usdValue;
  if (amount && price) {
    usdValue = ((amount / Math.pow(10, decimals)) * price).toFixed(2)
  }
  if (setUsdValue && usdValue) {
    setUsdValue(publicKey, parseFloat(usdValue));
  }

  return (
    <BalanceListItemView
      mint={mint}
      tokenName={tokenName}
      decimals={decimals}
      displayName={displayName}
      subtitle={subtitle}
      tokenLogoUri={tokenLogoUri}
      amount={amount}
      price={price}
      usdValue={usdValue}
      isAssociatedToken={isAssociatedToken}
      publicKey={publicKey}
      expandable={expandable}     
    />
  );
}
