/**
 * Cryptid represents a on-chain DID-like account
 *
 * This provides Cryptid Accounts independent from Solana Accounts.
 * - Generative Method from Wallet keys
 * -
 */
import React, { FC, useCallback, useContext, useEffect, useState } from "react";
import { useWallet, useWalletSelector } from "./wallet";
import { build as buildCryptid, Cryptid, Signer } from "@identity.com/cryptid";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { DIDDocument } from "did-resolver";
import { setInitialAccountInfo, useCluster, useConnection } from "./connection";
import { Account } from "./cryptid-external-types";
import { useAsyncData } from "./fetch-loop";
import { useRefEqual } from "./utils";
import { getOwnedTokenAccounts } from "./tokens";
import { parseTokenAccountData } from "./tokens/data";

export class CryptidAccount {
  public did: string
  public connection: Connection
  private cryptid: Cryptid;
  public address: PublicKey | null = null;
  public document: DIDDocument | null = null;

  constructor(did: string, signer: Signer, connection: Connection) {
    this.did = did
    this.connection = connection

    this.cryptid = buildCryptid(did, signer, {
      connection,
    })
  }

  async init() {
    this.address = await this.cryptid.address()
    this.document = await this.cryptid.document()
    // console.log(`Getting address: ${this.address}`)
    // console.log(`Getting document: ${JSON.stringify(this.document)}`)
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
    this.cryptid = buildCryptid(this.did, signer, {
      connection: this.connection,
    })
  }

  async addKey(address: PublicKey, alias: string) {
    return await this.cryptid.addKey(address, alias)
  }
}

interface CryptidContextInterface {
  cryptidAccounts: CryptidAccount[];
  selectedCryptidAccount: CryptidAccount | null;
  loaded: boolean;
}

const CryptidContext = React.createContext<CryptidContextInterface>({
  cryptidAccounts: [],
  selectedCryptidAccount: null,
  loaded: false,
});

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
    // Select first one by default
    if (cryptidAccounts.length > 0) {
      setSelectedCryptidAccount(cryptidAccounts[0])
    }

    setCryptidAccounts(cryptidAccounts)
  }, [accounts, cluster])

  useEffect(() => {
    loadCryptidAccounts()
  }, [loadCryptidAccounts])

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
    loaded,
  } = useContext(CryptidContext);
  return {
    selectedCryptidAccount,
    cryptidAccounts,
    loaded,
  }
}
