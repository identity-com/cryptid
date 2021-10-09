/**
 * Cryptid represents a on-chain DID-like account
 *
 * This provides Cryptid Accounts independent from Solana Accounts.
 * - Generative Method from Wallet keys
 * -
 */
import React, { FC, SetStateAction, useCallback, useContext, useEffect, useState } from "react";
import { build as buildCryptid, Cryptid, Signer } from "@identity.com/cryptid";
import { Connection, PublicKey, Transaction, TransactionSignature } from "@solana/web3.js";
import { DIDDocument } from "did-resolver";
import { setInitialAccountInfo, useCluster, useConnection } from "../connection";
import { refreshCache, useAsyncData } from "../fetch-loop";
import { useLocalStorageState, useRefEqual } from "../utils";
import {
  closeTokenAccount,
  createAssociatedTokenAccount,
  getOwnedTokenAccounts,
  nativeTransfer,
  transferTokens
} from "../tokens";
import { ACCOUNT_LAYOUT, parseTokenAccountData, TokenInfo } from "../tokens/data";
import { ServiceEndpoint } from "did-resolver/src/resolver";
import { useWalletContext } from "../wallet";

interface CryptidAccountInitData {
  didPrefix: string,
  didAddress: string,
  alias: string,
  signer: Signer,
  connection: Connection,
  parent?: CryptidAccount,
}

export class CryptidAccount {
  public readonly didPrefix: string;
  public readonly didAddress: string;
  public readonly alias: string;
  private _connection: Connection
  private _signer: Signer;
  private _cryptid: Cryptid;
  private _address: PublicKey;
  private _document: DIDDocument;
  // Crypid Account parent if controlled
  private _parent: CryptidAccount | undefined;

  private updateDocWrapper = async (f: () => Promise<TransactionSignature>) => {
    const signature =  f()
    await this.updateDocument()
    return signature;
  }

  private constructor({ didPrefix, didAddress, alias, signer, connection, parent} : CryptidAccountInitData) {
    this.didPrefix = didPrefix
    this.didAddress = didAddress
    this.alias = alias
    this._connection = connection
    this._address = new PublicKey(didAddress) // Note this is wrong, but will be updated by INIT, constructor is private
    this._document =  { id: "UNINITIALIZED" }; //Note this is wrong, but will be updated by INIT, constructor is private
    this._signer = signer
    this._parent = parent

    if (parent) {
      this._cryptid = parent.cryptid.as(this.did)
    } else {
      this._cryptid = buildCryptid(this.did, signer, {
        connection,
      })
    }
  }

  get did() {
    return `${this.didPrefix}:${this.didAddress}`
  }

  get publicKey() {
    return this._address
  }

  get address() {
    return this._address
  }

  get cryptid() {
    return this._cryptid
  }

  static async create(init: CryptidAccountInitData) {
    const account = new CryptidAccount(init)
    await account.init()
    return account;
  }

  async init() {
    this._address = await this.cryptid.address()
    await this.updateDocument();
    // console.log(`Getting address: ${this._address}`)
    // console.log(`Getting document: ${JSON.stringify(this.document)}`)
  }
  async as(controllerDidAddress: string, controllerAlias: string): Promise<CryptidAccount> {
    return CryptidAccount.create({
      didPrefix: this.didPrefix,
      didAddress: controllerDidAddress,
      alias: controllerAlias,
      signer: this._signer,
      connection: this._connection,
      parent: this
    })
  }
  
  signTransaction = (transaction: Transaction):Promise<Transaction> =>
    this.cryptid.sign(transaction).then(([signedTransaction]) => signedTransaction)

  updateDocument = async () => {
    this._document = await this.cryptid.document()
    console.log('Returned Document')
    console.log(this._document)
    return this._document
  }

  get isControlled() {
    return this._parent != null
  }

  get controlledBy() {
    return this._parent != null ? this._parent.did : this.did
  }

  baseAccount = () => {
    if (this._parent) {
      return this._parent.baseAccount()
    }

    return this
  }

  get verificationMethods() {
    if (!this._document || !this._document.verificationMethod) {
      return []
    }

    return this._document.verificationMethod
  }

  get controllers() {
    if (!this._document || !this._document.controller) {
      return []
    }

    return Array.isArray(this._document.controller) ? this._document.controller : [ this._document.controller ]
  }

  containsKey = (key: PublicKey): boolean => !!this.verificationMethods.find(x => x.publicKeyBase58 === key.toBase58())

  get isInitialized() {
    return this._address !== null && this._document !== null
  }

  updateSigner(signer: Signer) {
    this._signer = signer
    if (!this.isControlled) {
      this.cryptid.updateSigner(signer)
    }
    // this.cryptid = buildCryptid(this.did, signer, {
    //   connection: this.connection,
    // })
  }
  
  get activeSigningKey():PublicKey {
    return this._signer.publicKey
  }

  addKey = async (address: PublicKey, alias: string): Promise<TransactionSignature> =>
    this.updateDocWrapper(() => this.cryptid.addKey(address, alias))

  removeKey = async (alias: string): Promise<TransactionSignature> =>
    this.updateDocWrapper(() => this.cryptid.removeKey(alias))

  addService = async (service: ServiceEndpoint): Promise<TransactionSignature> =>
    this.updateDocWrapper(() => this.cryptid.addService(service))

  removeService = async (alias: string): Promise<TransactionSignature> =>
    this.updateDocWrapper(() => this.cryptid.removeService(alias))

  addController = async (did: string): Promise<TransactionSignature> =>
    this.updateDocWrapper(() => this.cryptid.addController(did))

  removeController = async (did: string): Promise<TransactionSignature> =>
    this.updateDocWrapper(() => this.cryptid.removeController(did))

  // Sollet Interface Wallet Functionality.
  transferToken = async (
    source,
    destination,
    amount,
    mint,
    decimals,
    memo = undefined,
    overrideDestinationCheck = false,
  ) => {
    if (source.equals(this._address)) {
      if (memo) {
        throw new Error('Memo not implemented');
      }
      return this.transferSol(destination, amount);
    }

    const signingWrapper = {
      // publicKey: this.signer.publicKey, // this set's both fromPubKey and Signer. :(
      publicKey: this._address,
      signTransaction: this.signTransaction.bind(this)
    }


    return await transferTokens({
      connection: this._connection,
      owner: signingWrapper,
      sourcePublicKey: source,
      destinationPublicKey: destination,
      amount,
      memo,
      mint,
      decimals,
      overrideDestinationCheck,
    });
  };

  transferSol = async (destination, amount) => {

    // The Tokens Interfaces expect a wallet with
    // interface Wallet {
    //   publicKey: PublicKey
    //   signTransaction: (transaction: Transaction) => Promise<Transaction>
    // }
    const signingWrapper = {
      // publicKey: this.signer.publicKey, // this set's both fromPubKey and Signer. :(
      publicKey: this._address,
      signTransaction: this.signTransaction.bind(this)
    }

    console.log(`Doing native transfer with ${this._signer.publicKey}`)

    return nativeTransfer(this._connection, signingWrapper, destination, amount);
  };

  getTokenAccountInfo = async (): Promise<{ publicKey: PublicKey, parsed: TokenInfo }[]> => {
    let accounts: {
      publicKey: PublicKey,
      accountInfo: TokenAccountInfo,
    }[] = this._address ? await getOwnedTokenAccounts(this._connection, await this._address) : [];
    return accounts.map<{
      publicKey: PublicKey,
      parsed: TokenInfo,
    }>(({ publicKey, accountInfo }) => {
      setInitialAccountInfo(this._connection, publicKey, accountInfo);
      return {
        publicKey,
        parsed: parseTokenAccountData(accountInfo.data),
      };
    }).sort((account1, account2) =>
        account1.parsed.mint.toBase58().localeCompare(account2.parsed.mint.toBase58())
    );
  }

  tokenAccountCost = async () => {
    return this._connection.getMinimumBalanceForRentExemption(
      ACCOUNT_LAYOUT.span,
    );
  };

  closeTokenAccount = async (publicKey, skipPreflight = false) => {
    return await closeTokenAccount({
      connection: this._connection,
      owner: {
        publicKey: this._address,
        signTransaction: this.signTransaction.bind(this)
      },
      sourcePublicKey: publicKey,
      skipPreflight,
    });
  };

  createAssociatedTokenAccount = async (splTokenMintAddress: PublicKey):Promise<[PublicKey, string]> => {
    return await createAssociatedTokenAccount({
      connection: this._connection,
      wallet: {
        publicKey: this._address,
        signTransaction: this.signTransaction.bind(this)
      },
      splTokenMintAddress,
    });
  };
}

export function useCryptidAccountPublicKeys(cryptid: CryptidAccount | null): [PublicKey[], boolean] {
  let [tokenAccountInfo, loaded] = useAsyncData(
      cryptid ? cryptid.getTokenAccountInfo : async () => [],
      cryptid ? cryptid.getTokenAccountInfo : async () => [], //TODO: Is thsi the best way to handle null?
  );
  let publicKeys = [
      ...(cryptid && cryptid.address ? [cryptid.address] : []),
      ...(tokenAccountInfo ? tokenAccountInfo.map(({ publicKey }) => publicKey) : []),
  ]
  publicKeys = useRefEqual(
      publicKeys,
      (oldKeys, newKeys) =>
          oldKeys.length === newKeys.length
          && oldKeys.every((key, i) => key.equals(newKeys[i]))
  );
  return [publicKeys, loaded]
}

export function refreshCryptidAccountPublicKeys(cryptidAccount: CryptidAccount) {
  refreshCache(cryptidAccount.getTokenAccountInfo);
}

export function useCryptidAccountTokenAccounts() {
  const { selectedCryptidAccount } = useCryptid();


  return useAsyncData(
    selectedCryptidAccount ? selectedCryptidAccount.getTokenAccountInfo : async () => [],
    selectedCryptidAccount ? selectedCryptidAccount.getTokenAccountInfo : async () => [], //TODO: Is thsi the best way to handle null?
  )
}

export type TokenAccountInfo = {
  data: Buffer,
  executable: boolean,
  owner: PublicKey,
  lamports: number,
}

interface CryptidContextInterface {
  cryptidAccounts: CryptidAccount[];
  selectedCryptidAccount: CryptidAccount | null;
  setSelectedCryptidAccount: (value: SetStateAction<CryptidAccount | null>) => void,
  addCryptidAccount: (base58Address: string, alias: string, parent?: CryptidAccount) => void
  removeCryptidAccount: (base58Address: string) => void
  getDidPrefix: () => string
}

const CryptidContext = React.createContext<CryptidContextInterface>({
  cryptidAccounts: [],
  selectedCryptidAccount: null,
  setSelectedCryptidAccount: () => {},
  addCryptidAccount: () => {},
  removeCryptidAccount: () => {},
  getDidPrefix: () => '',
});

interface CryptidSelectorInterface {
  selectedCryptidAccount: string | undefined
}

interface StoredCryptidAccount {
  account: string
  alias: string
  parent?: string
}


const DEFAULT_CRYPTID_SELECTOR = {
  selectedCryptidAccount: undefined
};

export const convertToPublicKey = (base58: string | undefined) => {
  // return back undefined
  if (!base58) {
    return
  }

  try {
    return new PublicKey(base58)
  } catch (error) {
    // return undefined
  }
};

const validatePublicKey = (base58: string) => {
  try {
    new PublicKey(base58)
  } catch (error) {
    throw new Error('Invalid key ' + base58);
  }
};

/**
 *
 * @param children
 * @constructor
 *
 * TODO:
 *  - Allow to add DIDs Cryptid Accounts that are not generative. (needs to add state).
 *
 */
export const CryptidProvider:FC = ({ children }) => {
  const { wallet, hasWallet, connectWallet } = useWalletContext();

  const connection = useConnection();
  const cluster = useCluster();

  const [cryptidSelector, setCryptidSelector] = useLocalStorageState<CryptidSelectorInterface>(
    'cryptidSelector',
    DEFAULT_CRYPTID_SELECTOR,
  );

  const [cryptidExtAccounts, setCryptidExtAccounts] = useLocalStorageState<StoredCryptidAccount[]>(
    'cryptidExternalAccounts',
    [],
  );

  const addCryptidAccount = useCallback((base58: string, alias: string, parent?: CryptidAccount) => {
    validatePublicKey(base58);
    
    if (cryptidExtAccounts.map(x => x.account).indexOf(base58) < 0) {
      // set to new account
      setCryptidSelector({
        selectedCryptidAccount: base58
      })

      const parentBase58 = parent?.didAddress
      setCryptidExtAccounts(cryptidExtAccounts.concat([ { account: base58, alias, parent: parentBase58 }]))
    }
  }, [setCryptidExtAccounts])

  const removeCryptidAccount = useCallback((base58: string) => {
    const idx = cryptidExtAccounts.map(x => x.account).indexOf(base58)
    if (idx >= 0) {
      setCryptidExtAccounts(cryptidExtAccounts.splice(idx, 1))
    }
  }, [setCryptidExtAccounts])

  // In order to not
  const [selectedCryptidAccount, setSelectedCryptidAccount] = useState<CryptidAccount | null>(null);
  const [cryptidAccounts, setCryptidAccounts] = useState<CryptidAccount[]>([])

  const getDidPrefix = useCallback(() => {
    // sol dids on mainnet have no cluster prefix 
    const clusterPrefix = cluster === 'mainnet-beta' ? '' : `:${cluster}`;
    return `did:sol${clusterPrefix}`;
  },[cluster])

  const loadCryptidAccounts = useCallback(async () => {
    // // generative accounts + extAccounts
    // const allAccounts = accounts.map(a => a.address.toBase58())
    //
    // // generated
    // const promises = allAccounts.map(async (base58) => {
    //   const cryptidAccount = new CryptidAccount(`${getDidPrefix()}${base58}`, defaultSigner, connection )
    //   await cryptidAccount.init()
    //   return cryptidAccount
    // })
    // const cryptidAccounts = await Promise.all(promises);
    const defaultSigner = { // TODO
      publicKey: wallet.publicKey as PublicKey,
      sign: (transaction: Transaction) => Promise.resolve(transaction)
    }

    // TODO: This is not robust, since dependent accounts need to be loaded first.
    for (const ext of cryptidExtAccounts) {
      const parentAccount = cryptidAccounts.find(x => x.didAddress === ext.parent)
      let cryptidAccount;
      if (parentAccount) {
        cryptidAccount = await parentAccount.as(ext.account, ext.alias)
      } else {
        console.log('Creating did account for ' + ext.account)
        cryptidAccount = await CryptidAccount.create({
          didPrefix: getDidPrefix(),
          didAddress: ext.account,
          alias: ext.alias,
          signer: defaultSigner,
          connection
        })
      }
      cryptidAccounts.push(cryptidAccount)
    }

    if (cryptidAccounts.length > 0) {
      // Selected from cryptidSelector or fallback to first.
      const selected = cryptidAccounts.find(a => a.did === getDidPrefix() + cryptidSelector.selectedCryptidAccount) || cryptidAccounts[0]
      console.log('Setting Account for ' + selected.didAddress)
      setSelectedCryptidAccount(selected)
    }

    setCryptidAccounts(cryptidAccounts)
  }, [cluster, cryptidExtAccounts, setCryptidAccounts])

  useEffect(() => {
    console.log('useEffect loadCryptidAccounts')
    loadCryptidAccounts()
  }, [loadCryptidAccounts])

  // persist selected selectedCryptidAccount to localStorage
  useEffect(() => {
    console.log('useEffect setCryptidSelector')

    if (selectedCryptidAccount) {
      setCryptidSelector({
        selectedCryptidAccount: selectedCryptidAccount.didAddress
      })
    }
  }, [selectedCryptidAccount])

  // find and assign Wallet to current account
  useEffect(() => {
    console.log('useEffect findWallet')

    if (!selectedCryptidAccount) { return }

    // already has key assigned?
    if (wallet.publicKey && selectedCryptidAccount.containsKey(wallet.publicKey)) {
      return
    }

    // find and assign wallet
    console.log(`Trying to find wallet for CryptidAccount ${selectedCryptidAccount.address}`)

    // TODO: consider base-case
    for (const vm of selectedCryptidAccount.verificationMethods) {
      const pubKey = convertToPublicKey(vm.publicKeyBase58)
      console.log('Matching to Wallet: '+ vm.publicKeyBase58)

      if (pubKey && hasWallet(pubKey)) {
          console.log('Changing to Wallet: '+ vm.publicKeyBase58)
          connectWallet(pubKey)
          break
        }
    }

  }, [selectedCryptidAccount, wallet, connectWallet])

  // find and assign Wallet to current account
  useEffect(() => {
    console.log('useEffect Update Signer')

    if (!selectedCryptidAccount || !wallet.publicKey || !wallet.signTransaction) {
      return
    }

    // already has key assigned in signer
    if (selectedCryptidAccount.activeSigningKey && wallet.publicKey.equals(selectedCryptidAccount.activeSigningKey)) {
      return
    }

    console.log(`Updating signer to ${wallet.publicKey}`)
    selectedCryptidAccount.updateSigner({
      publicKey: wallet.publicKey,
      sign: wallet.signTransaction
    })
  }, [wallet, selectedCryptidAccount])



  return (<CryptidContext.Provider
    value={{
      cryptidAccounts,
      selectedCryptidAccount,
      setSelectedCryptidAccount,
      addCryptidAccount,
      removeCryptidAccount,
      getDidPrefix,
    }}
  >
    {children}
  </CryptidContext.Provider>);
}

export function useCryptid() {
  return useContext(CryptidContext);
}
