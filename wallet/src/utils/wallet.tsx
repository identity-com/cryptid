import React, { useContext, useEffect, useMemo, useState } from 'react';
import * as bs58 from 'bs58';
import { Account, Connection, PublicKey, Transaction } from '@solana/web3.js';
import nacl from 'tweetnacl';
import {
  setInitialAccountInfo,
  useAccountInfo,
  useConnection,
} from './connection';
import {
  closeTokenAccount,
  createAndInitializeTokenAccount,
  createAssociatedTokenAccount,
  getOwnedTokenAccounts,
  nativeTransfer,
  transferTokens,
} from './tokens';
import { TOKEN_PROGRAM_ID } from './tokens/instructions';
import {
  ACCOUNT_LAYOUT,
  parseMintData,
  parseTokenAccountData,
} from './tokens/data';
import { useListener, useLocalStorageState, useRefEqual } from './utils';
import { useTokenInfo } from './tokens/names';
import { refreshCache, useAsyncData } from './fetch-loop';
import { useUnlockedMnemonicAndSeed, walletSeedChanged } from './wallet-seed';
import { WalletProviderFactory, WalletProviderInterface } from './walletProvider/factory';
import { getAccountFromSeed } from './walletProvider/localStorage';
import { useSnackbar } from 'notistack';
import { useWallet as useSolAdapterWallet } from '@solana/wallet-adapter-react';

interface WalletSelectorInferface {
  walletIndex?: number,
  importedPubkey?: string,
  type: string
}

interface WalletAccountInterface {
  selector: WalletSelectorInferface,
  address: PublicKey,
  name: string,
  isSelected: boolean
}

const WALLET_TYPE = {
  sw: 'sw',
  adapter: 'adapter',
}

const DEFAULT_WALLET_SELECTOR: WalletSelectorInferface = {
  walletIndex: 0, // only for sw
  importedPubkey: undefined, // only for sw
  type: WALLET_TYPE.sw,
};

export class Wallet {
  private provider: WalletProviderInterface;

  constructor(private connection: Connection, private type: string, args) {
    this.type = type;
    this.provider = WalletProviderFactory.getProvider(type, args);
  }

  static create = async (connection, type, args) => {
    const instance = new Wallet(connection, type, args);
    await instance.provider.init();
    return instance;
  };

  get publicKey() {
    return this.provider.publicKey;
  }

  get allowsExport() {
    return this.type === 'local';
  }

  getTokenAccountInfo = async () => {
    let accounts = await getOwnedTokenAccounts(this.connection, this.publicKey);
    return accounts
      .map(({ publicKey, accountInfo }) => {
        setInitialAccountInfo(this.connection, publicKey, accountInfo);
        return { publicKey, parsed: parseTokenAccountData(accountInfo.data) };
      })
      .sort((account1, account2) =>
        account1.parsed.mint
          .toBase58()
          .localeCompare(account2.parsed.mint.toBase58()),
      );
  };

  createTokenAccount = async (tokenAddress: PublicKey) => {
    return await createAndInitializeTokenAccount({
      connection: this.connection,
      payer: this,
      mintPublicKey: tokenAddress,
      newAccount: new Account(),
    });
  };

  createAssociatedTokenAccount = async (splTokenMintAddress: PublicKey) => {
    return await createAssociatedTokenAccount({
      connection: this.connection,
      wallet: this,
      splTokenMintAddress,
    });
  };

  tokenAccountCost = async () => {
    return this.connection.getMinimumBalanceForRentExemption(
      ACCOUNT_LAYOUT.span,
    );
  };

  transferToken = async (
    source: PublicKey,
    destination: PublicKey,
    amount: number,
    mint: PublicKey,
    decimals: number,
    memo: string | undefined = undefined,
    overrideDestinationCheck: boolean = false,
  ) => {
    if (source.equals(this.publicKey)) {
      if (memo) {
        throw new Error('Memo not implemented');
      }
      return this.transferSol(destination, amount);
    }
    return await transferTokens({
      connection: this.connection,
      owner: this,
      sourcePublicKey: source,
      destinationPublicKey: destination,
      amount,
      memo,
      mint,
      decimals,
      overrideDestinationCheck,
    });
  };

  transferSol = async (destination: PublicKey, amount: number) => {
    return nativeTransfer(this.connection, this, destination, amount);
  };

  closeTokenAccount = async (publicKey: PublicKey, skipPreflight = false) => {
    return await closeTokenAccount({
      connection: this.connection,
      owner: this,
      sourcePublicKey: publicKey,
      skipPreflight,
    });
  };

  signTransaction = async (transaction: Transaction) => {
    return this.provider.signTransaction(transaction);
  };

  // TODO: This should be removed, since the interface will no longer be used.
  createSignature = async (message: Uint8Array) => {
    return this.provider.createSignature(message);
  };
}

const WalletContext = React.createContext<unknown>(null);

export function WalletProvider({ children }) {
  useListener(walletSeedChanged, 'change');
  const [{
    mnemonic,
    seed,
    importsEncryptionKey,
    derivationPath,
  }] = useUnlockedMnemonicAndSeed();
  const { enqueueSnackbar } = useSnackbar();
  const connection = useConnection();
  const [wallet, setWallet] = useState();

  // `privateKeyImports` are accounts imported *in addition* to HD wallets
  const [privateKeyImports, setPrivateKeyImports] = useLocalStorageState(
    'walletPrivateKeyImports',
    {},
  );
  // `walletSelector` identifies which wallet to use.
  let [walletSelector, setWalletSelector] = useLocalStorageState(
    'walletSelector',
    DEFAULT_WALLET_SELECTOR,
  );
  // `walletCount` is the number of HD wallets.
  const [walletCount, setWalletCount] = useLocalStorageState('walletCount', 1);


  const { publicKey, signTransaction } = useSolAdapterWallet()

  useEffect(() => {
    (async () => {
      if (!seed) {
        return null;
      }
      let wallet;

      // is connected via wallet adapter.
      if (walletSelector.type === WALLET_TYPE.adapter && publicKey) {
        wallet = await Wallet.create(connection, 'adapter', {
          publicKey,
          signTransaction,
        });
      }

      if (!wallet) {
        const account =
          walletSelector.walletIndex !== undefined
            ? getAccountFromSeed(
              Buffer.from(seed, 'hex'),
              walletSelector.walletIndex,
              derivationPath,
            )
            : new Account(
              (() => {
                const { nonce, ciphertext } = privateKeyImports[
                  walletSelector.importedPubkey as string
                  ];
                return nacl.secretbox.open(
                  bs58.decode(ciphertext),
                  bs58.decode(nonce),
                  importsEncryptionKey as Buffer,
                ) as Uint8Array;
              })(),
            );
        wallet = await Wallet.create(connection, 'local', { account });
      }
      setWallet(wallet);
    })();
  }, [
    connection,
    seed,
    walletSelector,
    privateKeyImports,
    importsEncryptionKey,
    setWalletSelector,
    enqueueSnackbar,
    derivationPath,
    publicKey,
  ]);
  function addAccount({ name, importedAccount }) {
    if (importedAccount === undefined) {
      name && localStorage.setItem(`name${walletCount}`, name);
      setWalletCount(walletCount + 1);
    } else {
      const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
      const plaintext = importedAccount.secretKey;
      const ciphertext = nacl.secretbox(plaintext, nonce, importsEncryptionKey as Buffer);
      // `useLocalStorageState` requires a new object.
      let newPrivateKeyImports = { ...privateKeyImports };
      newPrivateKeyImports[importedAccount.publicKey.toString()] = {
        name,
        ciphertext: bs58.encode(ciphertext),
        nonce: bs58.encode(nonce),
      };
      setPrivateKeyImports(newPrivateKeyImports);
    }
  }

  const getWalletNames = () => {
    return JSON.stringify(
      [...Array(walletCount).keys()].map((idx) =>
        localStorage.getItem(`name${idx}`),
      ),
    );
  };
  const [walletNames, setWalletNames] = useState(getWalletNames());
  function setAccountName(selector, newName) {
    if (selector.importedPubkey) {
      let newPrivateKeyImports = { ...privateKeyImports };
      newPrivateKeyImports[selector.importedPubkey.toString()].name = newName;
      setPrivateKeyImports(newPrivateKeyImports);
    } else {
      localStorage.setItem(`name${selector.walletIndex}`, newName);
      setWalletNames(getWalletNames());
    }
  }

  const [accounts, derivedAccounts] = useMemo<[accounts: WalletAccountInterface[], derivedAccounts: WalletAccountInterface[]]>(() => {
    if (!seed) {
      return [[], []];
    }

    const seedBuffer = Buffer.from(seed, 'hex');
    const derivedAccounts: WalletAccountInterface[] = [...Array(walletCount).keys()].map((idx) => {
      let address = getAccountFromSeed(seedBuffer, idx, derivationPath)
        .publicKey;
      let name = localStorage.getItem(`name${idx}`);
      return {
        selector: {
          walletIndex: idx,
          importedPubkey: undefined,
          type: WALLET_TYPE.sw,
        },
        isSelected: walletSelector.type === WALLET_TYPE.sw && walletSelector.walletIndex === idx,
        address,
        name: idx === 0 ? 'Main account' : name || `Account ${idx}`,
      };
    });

    const importedAccounts: WalletAccountInterface[] = Object.keys(privateKeyImports).map((pubkey) => {
      const { name } = privateKeyImports[pubkey];
      return {
        selector: {
          walletIndex: undefined,
          importedPubkey: pubkey,
          type: WALLET_TYPE.sw,
        },
        address: new PublicKey(bs58.decode(pubkey)),
        name: `${name} (imported)`, // TODO: do this in the Component with styling.
        isSelected: walletSelector.importedPubkey === pubkey,
      };
    });

    // insert adapter as account.
    const adapterAccount: WalletAccountInterface[] = []
    if (publicKey) {
      adapterAccount.push({
        selector: {
          walletIndex: undefined,
          importedPubkey: undefined,
          type: WALLET_TYPE.adapter,
        },
        isSelected: walletSelector.type === WALLET_TYPE.adapter,
        address: publicKey,
        name: 'External',
      })
    }

    const accounts = derivedAccounts.concat(importedAccounts).concat(adapterAccount);
    return [accounts, derivedAccounts];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, walletCount, walletSelector, privateKeyImports, walletNames, publicKey]);


  return (
    <WalletContext.Provider
      value={{
        wallet,
        seed,
        mnemonic,
        importsEncryptionKey,
        walletSelector,
        setWalletSelector,
        privateKeyImports,
        setPrivateKeyImports,
        accounts,
        derivedAccounts,
        addAccount,
        setAccountName,
        derivationPath,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext)?.wallet;
}

export function useWalletPublicKeys() {
  let wallet = useWallet();
  let [tokenAccountInfo, loaded] = useAsyncData(
    wallet.getTokenAccountInfo,
    wallet.getTokenAccountInfo,
  );
  let publicKeys = [
    wallet.publicKey,
    ...(tokenAccountInfo
      ? tokenAccountInfo.map(({ publicKey }) => publicKey)
      : []),
  ];
  // Prevent users from re-rendering unless the list of public keys actually changes
  publicKeys = useRefEqual(
    publicKeys,
    (oldKeys, newKeys) =>
      oldKeys.length === newKeys.length &&
      oldKeys.every((key, i) => key.equals(newKeys[i])),
  );
  return [publicKeys, loaded];
}

export function useWalletTokenAccounts() {
  let wallet = useWallet();
  return useAsyncData(wallet.getTokenAccountInfo, wallet.getTokenAccountInfo);
}

export function refreshWalletPublicKeys(wallet) {
  refreshCache(wallet.getTokenAccountInfo);
}

export function useWalletAddressForMint(mint) {
  const [walletAccounts] = useWalletTokenAccounts();
  return useMemo(
    () =>
      mint
        ? walletAccounts
          ?.find((account) => account.parsed?.mint?.equals(mint))
          ?.publicKey.toBase58()
        : null,
    [walletAccounts, mint],
  );
}

export function useBalanceInfo(publicKey) {
  let [accountInfo, accountInfoLoaded] = useAccountInfo(publicKey);
  let { mint, owner, amount }: {mint?: PublicKey, owner?: PublicKey, amount?: number}  = accountInfo?.owner.equals(TOKEN_PROGRAM_ID)
    ? parseTokenAccountData(accountInfo.data)
    : {};
  let [mintInfo, mintInfoLoaded] = useAccountInfo(mint);
  let { name, symbol, logoUri } = useTokenInfo(mint);

  if (!accountInfoLoaded) {
    return null;
  }

  if (mint && mintInfoLoaded && mintInfo) {
    try {
      let { decimals } = parseMintData(mintInfo.data);
      return {
        amount,
        decimals,
        mint,
        owner,
        tokenName: name,
        tokenSymbol: symbol,
        tokenLogoUri: logoUri,
        valid: true,
      };
    } catch (e) {
      return {
        amount,
        decimals: 0,
        mint,
        owner,
        tokenName: 'Invalid',
        tokenSymbol: 'INVALID',
        tokenLogoUri: null,
        valid: false,
      };
    }
  }

  if (!mint) {
    return {
      amount: accountInfo?.lamports ?? 0,
      decimals: 9,
      mint: null,
      owner: publicKey,
      tokenName: 'SOL',
      tokenSymbol: 'SOL',
      valid: true,
    };
  }

  return null;
}

export function useWalletSelector() {
  const {
    accounts,
    derivedAccounts,
    addAccount,
    setWalletSelector,
    setAccountName,
  } = useContext(WalletContext) as any;

  return {
    accounts,
    derivedAccounts,
    setWalletSelector,
    addAccount,
    setAccountName,
  };
}
