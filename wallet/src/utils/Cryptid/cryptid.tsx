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
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { DIDDocument } from "did-resolver";
import { setInitialAccountInfo, useCluster, useConnection } from "../connection";
import { Account } from "./cryptid-external-types";
import { useAsyncData } from "../fetch-loop";
import { useLocalStorageState, useRefEqual } from "../utils";
import { getOwnedTokenAccounts, nativeTransfer, transferTokens } from "../tokens";
import { parseTokenAccountData } from "../tokens/data";

export class CryptidAccount {
  public did: string
  public connection: Connection
  private signer: Signer;
  private cryptid: Cryptid;
  public address: PublicKey | null = null;
  public document: DIDDocument | null = null;

  constructor(did: string, signer: Signer, connection: Connection) {
    this.did = did
    this.connection = connection
    this.signer = signer

    this.cryptid = buildCryptid(did, signer, {
      connection,
    })
  }

  async init() {
    if (this.isInitialized) {
      return
    }

    this.address = await this.cryptid.address()
    await this.updateDocument();
    // console.log(`Getting address: ${this.address}`)
    // console.log(`Getting document: ${JSON.stringify(this.document)}`)
  }

  updateDocument = async () => {
    this.document = await this.cryptid.document()
  }

  get verificationMethods() {
    if (!this.document || !this.document.verificationMethod) {
      return []
    }

    return this.document.verificationMethod
  }

  get isInitialized() {
    return this.address !== null && this.document !== null
  }

  updateSigner(signer: Signer) {
    this.signer = signer
    this.cryptid = buildCryptid(this.did, signer, {
      connection: this.connection,
    })
  }

  addKey = async(address: PublicKey, alias: string) => {
    return await this.cryptid.addKey(address, alias)
  }

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
      signTransaction: (transaction: Transaction) => this.cryptid.sign(transaction).then(transactions => transactions.pop())
    }

    console.log(`Doing native transfer with ${this.signer.publicKey}`)

    return nativeTransfer(this.connection, signingWrapper, destination, amount);
  };
}



interface CryptidContextInterface {
  cryptidAccounts: CryptidAccount[];
  selectedCryptidAccount: CryptidAccount | null;
  setSelectedCryptidAccount: (value: SetStateAction<CryptidAccount | null>) => void,
  loaded: boolean;
}

const CryptidContext = React.createContext<CryptidContextInterface>({
  cryptidAccounts: [],
  selectedCryptidAccount: null,
  setSelectedCryptidAccount: () => {},
  loaded: false,
});

interface CryptidSelectorInterface {
  selectedCryptidAccountDid: string | undefined
}

const DEFAULT_CRYPTID_SELECTOR = {
  selectedCryptidAccountDid: undefined
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
  const { accounts }: { accounts: Account[] } = useWalletSelector();

  let [cryptidSelector, setCryptidSelector] = useLocalStorageState<CryptidSelectorInterface>(
    'cryptidSelector',
    DEFAULT_CRYPTID_SELECTOR,
  );

  // In order to not

  const [selectedCryptidAccount, setSelectedCryptidAccount] = useState<CryptidAccount | null>(null);
  const [cryptidAccounts, setCryptidAccounts] = useState<CryptidAccount[]>([])

  // TODO: Is it ok to pass an invalid Signer for the initial Account creation?
  const defaultSigner = {
    publicKey: wallet?.publicKey,
    sign: wallet?.signTransaction
  }

  const loadCryptidAccounts = useCallback(async () => {
    const promises = accounts.map(async (a) => {
      const cryptidAccount = new CryptidAccount(`did:sol:${cluster}:${a.address}`, defaultSigner, connection )
      await cryptidAccount.init()
      return cryptidAccount
    })

    const cryptidAccounts = await Promise.all(promises);
    if (cryptidAccounts.length > 0) {
      // Selected from cryptidSelector or fallback to first.
      const selected = cryptidAccounts.find(a => a.did === cryptidSelector.selectedCryptidAccountDid) || cryptidAccounts[0]
      setSelectedCryptidAccount(selected)
    }

    setCryptidAccounts(cryptidAccounts)
  }, [accounts, cluster])

  useEffect(() => {
    loadCryptidAccounts()
  }, [loadCryptidAccounts])

  // persist selected selectedCryptidAccount to localStorage
  useEffect(() => {
    if (selectedCryptidAccount) {
      setCryptidSelector({
        selectedCryptidAccountDid: selectedCryptidAccount.did
      })
    }
  }, [selectedCryptidAccount])

  // update Signer of selectedcCyptidAccount whenever wallet changes.
  useEffect(() => {
    if (!wallet || !selectedCryptidAccount) { return }

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
      loaded: !!selectedCryptidAccount
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
    loaded,
  } = useContext(CryptidContext);
  return {
    selectedCryptidAccount,
    cryptidAccounts,
    setSelectedCryptidAccount,
    loaded,
  }
}
