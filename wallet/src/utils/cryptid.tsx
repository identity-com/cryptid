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
import { useCluster, useConnection } from "./connection";
import { Account } from "./cryptid-external-types";

export class CryptidAccount {
  private did: string
  private cryptid: Cryptid;
  private address: PublicKey | null = null;
  private document: DIDDocument | null = null;

  constructor(did: string, signer: Signer, connection: Connection) {
    this.cryptid = buildCryptid(did, signer, {
      connection,
    })
    this.did = did
  }

  async init() {
    this.address = await this.cryptid.address()
    this.document = await this.cryptid.document()
    // console.log(`Getting address: ${this.address}`)
    // console.log(`Getting document: ${JSON.stringify(this.document)}`)
  }

  get isInitialized() {
    return this.address !== null && this.document !== null
  }
}

interface CryptidContextInterface {
  cryptidAccounts: CryptidAccount[];
}

const CryptidContext = React.createContext<CryptidContextInterface>({
  cryptidAccounts: [],
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

  const [cryptidAccounts, setCryptidAccounts] = useState<CryptidAccount[]>([])

  const cryptidSign = useCallback(async(transaction: Transaction) => {
    // TODO: Make more dynamic and add checks
    return wallet.sign(transaction)
  }, [])

  const cryptidSigner = {
    publicKey: wallet?.publicKey, // TODO: Make more dynamic and add checks
    sign: cryptidSign
  }

  const loadCryptidAccounts = useCallback(async () => {
    const promises = accounts.map(async (a) => {
      const cryptidAccount = new CryptidAccount(`did:sol:${cluster}:${a.address}`, cryptidSigner, connection )
      await cryptidAccount.init()
      return cryptidAccount
    })
    setCryptidAccounts(await Promise.all(promises))
  }, [accounts, cluster])

  useEffect(() => {
    loadCryptidAccounts()
  }, [loadCryptidAccounts])



  return (<CryptidContext.Provider
    value={{
      cryptidAccounts
    }}
  >
    {children}
  </CryptidContext.Provider>);
}

export function useCryptidAccounts() {
  return useContext(CryptidContext).cryptidAccounts;
}
