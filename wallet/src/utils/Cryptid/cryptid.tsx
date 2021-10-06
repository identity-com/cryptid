/**
 * Cryptid represents a on-chain DID-like account
 *
 * This provides Cryptid Accounts independent from Solana Accounts.
 * - Generative Method from Wallet keys
 * -
 */
import React, { FC, SetStateAction, useCallback, useContext, useEffect, useState } from "react";
import { useWallet, useWalletSelector } from "../wallet";
import { build as buildCryptid, Cryptid, Signer } from "@identity.com/cryptid";
import { Connection, PublicKey, Transaction, TransactionSignature } from "@solana/web3.js";
import { DIDDocument } from "did-resolver";
import { setInitialAccountInfo, useCluster, useConnection } from "../connection";
import { Account } from "./cryptid-external-types";
import { useAsyncData } from "../fetch-loop";
import { useLocalStorageState, useRefEqual } from "../utils";
import { getOwnedTokenAccounts, nativeTransfer, transferTokens } from "../tokens";
import { parseTokenAccountData } from "../tokens/data";
import { ServiceEndpoint } from "did-resolver/src/resolver";

export class CryptidAccount {
  public did: string
  public connection: Connection
  private signer: Signer;
  private cryptid: Cryptid;
  public address: PublicKey | null = null;
  public document: DIDDocument | null = null;
  // Crypid Account parent if controlled
  private parent: CryptidAccount | null;

  private updateDocWrapper = async (f: () => Promise<TransactionSignature>) => {
    const signature =  f()
    await this.updateDocument()
    return signature;
  }

  constructor(did: string, signer: Signer, connection: Connection, parent: CryptidAccount | null = null) {
    this.did = did
    this.connection = connection
    this.signer = signer
    this.parent = parent

    if (parent != null) {
      this.cryptid = parent.cryptid.as(did)
    } else {
      this.cryptid = buildCryptid(did, signer, {
        connection,
      })
    }
  }

  init = async () => {
    if (this.isInitialized) {
      return
    }

    this.address = await this.cryptid.address()
    await this.updateDocument();
    // console.log(`Getting address: ${this.address}`)
    // console.log(`Getting document: ${JSON.stringify(this.document)}`)
  }
  as = (controllerDID: string): CryptidAccount => {
    return new CryptidAccount(controllerDID, this.signer, this.connection, this)
  }
  
  signTransaction = (transaction: Transaction):Promise<Transaction> =>
    this.cryptid.sign(transaction).then(([signedTransaction]) => signedTransaction)

  updateDocument = async () => {
    this.document = await this.cryptid.document()
    return this.document
  }

  get isControlled() {
    return this.parent != null
  }

  get controlledBy() {
    return this.parent != null ? this.parent.did : this.did
  }

  baseAccount = () => {
    if (this.parent) {
      return this.parent.baseAccount()
    }

    return this
  }

  get verificationMethods() {
    if (!this.document || !this.document.verificationMethod) {
      return []
    }

    return this.document.verificationMethod
  }

  get controllers() {
    if (!this.document || !this.document.controller) {
      return []
    }

    return Array.isArray(this.document.controller) ? this.document.controller : [ this.document.controller ]
  }

  containsKey = (key: PublicKey): boolean => !!this.verificationMethods.find(x => x.publicKeyBase58 === key.toBase58())

  get isInitialized() {
    return this.address !== null && this.document !== null
  }

  updateSigner(signer: Signer) {
    this.signer = signer
    if (!this.isControlled) {
      this.cryptid.updateSigner(signer)
    }
    // this.cryptid = buildCryptid(this.did, signer, {
    //   connection: this.connection,
    // })
  }
  
  activeSigningKey():PublicKey {
    return this.signer.publicKey
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
    memo = null,
    overrideDestinationCheck = false,
  ) => {
    if (source.equals(this.address)) {
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

  transferSol = async (destination, amount) => {
    // The Tokens Interfaces expect a wallet with
    // interface Wallet {
    //   publicKey: PublicKey
    //   signTransaction: (transaction: Transaction) => Promise<Transaction>
    // }
    const signingWrapper = {
      // publicKey: this.signer.publicKey, // this set's both fromPubKey and Signer. :(
      publicKey: this.address,
      signTransaction: this.signTransaction.bind(this)
    }

    console.log(`Doing native transfer with ${this.signer.publicKey}`)

    return nativeTransfer(this.connection, signingWrapper, destination, amount);
  };
}

interface CryptidContextInterface {
  cryptidAccounts: CryptidAccount[];
  selectedCryptidAccount: CryptidAccount | null;
  setSelectedCryptidAccount: (value: SetStateAction<CryptidAccount | null>) => void,
  addCryptidAccount: (b: string, parent?: CryptidAccount) => void
  removeCryptidAccount: (b: string) => void
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
  parent?: string
}


const DEFAULT_CRYPTID_SELECTOR = {
  selectedCryptidAccount: undefined
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
  const wallet = useWallet();

  const connection = useConnection();
  const cluster = useCluster();
  const { accounts, setWalletSelector }: { accounts: Account[], setWalletSelector: any } = useWalletSelector();

  const [cryptidSelector, setCryptidSelector] = useLocalStorageState<CryptidSelectorInterface>(
    'cryptidSelector',
    DEFAULT_CRYPTID_SELECTOR,
  );

  const [cryptidExtAccounts, setCryptidExtAccounts] = useLocalStorageState<StoredCryptidAccount[]>(
    'cryptidExternalAccounts',
    [],
  );

  const addCryptidAccount = useCallback((base58: string, parent?: CryptidAccount) => {
    if (cryptidExtAccounts.map(x => x.account).indexOf(base58) < 0) {
      // set to new account
      setCryptidSelector({
        selectedCryptidAccount: base58
      })

      // TODO: Allow for accessor without DID prefix.
      const parentBase58 = parent?.did.replace(getDidPrefix(), '')
      setCryptidExtAccounts(cryptidExtAccounts.concat([ { account: base58, parent: parentBase58 }]))
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

  // TODO: Is it ok to pass an invalid Signer for the initial Account creation?
  const defaultSigner = {
    publicKey: wallet?.publicKey,
    sign: wallet?.signTransaction
  }

  const getDidPrefix = useCallback(() => {
    // sol dids on mainnet have no cluster prefix 
    const clusterPrefix = cluster === 'mainnet-beta' ? '' : `${cluster}:`;
    return `did:sol:${clusterPrefix}`;
  },[cluster])

  const loadCryptidAccounts = useCallback(async () => {
    // generative accounts + extAccounts
    const allAccounts = accounts.map(a => a.address.toBase58())

    // generated
    const promises = allAccounts.map(async (base58) => {
      const cryptidAccount = new CryptidAccount(`${getDidPrefix()}${base58}`, defaultSigner, connection )
      await cryptidAccount.init()
      return cryptidAccount
    })
    const cryptidAccounts = await Promise.all(promises);

    // TODO: This is not robust, since dependent accounts need to be loaded first.
    for (const ext of cryptidExtAccounts) {
      const parentAccount = cryptidAccounts.find(x => x.did === `${getDidPrefix()}${ext.parent}`)
      let cryptidAccount;
      if (parentAccount) {
        cryptidAccount = parentAccount.as(`${getDidPrefix()}${ext.account}`)
      } else {
        cryptidAccount = new CryptidAccount(`${getDidPrefix()}${ext.account}`, defaultSigner, connection )
      }
      await cryptidAccount.init()
      cryptidAccounts.push(cryptidAccount)
    }

    if (cryptidAccounts.length > 0) {
      // Selected from cryptidSelector or fallback to first.
      const selected = cryptidAccounts.find(a => a.did === getDidPrefix() + cryptidSelector.selectedCryptidAccount) || cryptidAccounts[0]
      setSelectedCryptidAccount(selected)
    }

    setCryptidAccounts(cryptidAccounts)
  }, [accounts, cluster, cryptidExtAccounts])

  useEffect(() => {
    loadCryptidAccounts()
  }, [loadCryptidAccounts])

  // persist selected selectedCryptidAccount to localStorage
  useEffect(() => {
    if (selectedCryptidAccount) {
      setCryptidSelector({
        selectedCryptidAccount: selectedCryptidAccount.did.replace(getDidPrefix(), '')
      })
    }
  }, [selectedCryptidAccount])

  // Pre-select wallet if account changes.
  // update Signer of selectedcCyptidAccount whenever wallet changes.
  useEffect(() => {
    if (!wallet || !selectedCryptidAccount) { return }

    const crypidBaseAccount = selectedCryptidAccount.baseAccount()

    if (!crypidBaseAccount.containsKey(wallet.publicKey)) {
      // try to find PK in accounts
      console.log(`Key of wallet (${wallet.publicKey.toBase58()}) not in selectedCryptidAccount ${crypidBaseAccount.did}`)

      for (const acc of accounts) {
        if (crypidBaseAccount.containsKey(acc.address)) {
          // switch to acc with matching key.
          setWalletSelector(acc.selector)
        }
      }

      return
    }

    console.log(`Updating signer to ${wallet.publicKey}`)
    selectedCryptidAccount.updateSigner({
      publicKey: wallet.publicKey,
      sign: wallet.signTransaction
    })

  }, [selectedCryptidAccount])



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
  const {
    selectedCryptidAccount,
    cryptidAccounts,
    setSelectedCryptidAccount,
    addCryptidAccount,
    removeCryptidAccount,
    getDidPrefix,
  } = useContext(CryptidContext);
  return {
    selectedCryptidAccount,
    cryptidAccounts,
    setSelectedCryptidAccount,
    addCryptidAccount,
    removeCryptidAccount,
    getDidPrefix,
  }
}
