import {useWeb3React} from "@web3-react/core";
import {useConnection, useWallet} from "@solana/wallet-adapter-react";
import {useCallback, useEffect, useState} from "react";
import {EthRegistry, ReadOnlyRegistry, Registry, Wallet} from "@civic/did-registry";
import { PublicKey } from "@solana/web3.js";
import { useDID } from "./useDID";

export type RegistryContext = {
    registeredSolanaDIDs: string[],
    registeredEthereumDIDs: string[],
    solanaKeyRegistry?: Registry,
    ethereumKeyRegistry?: EthRegistry
    getRegisteredDIDsForEthAddress: (ethAddress: string) => Promise<string[]>,
    getRegisteredDIDsForAccount: (account: PublicKey) => Promise<string[]>,
    reload: () => void
};
export const useRegistry = (): RegistryContext => {
    const { cluster } = useDID();
    const { account } = useWeb3React();
    const wallet = useWallet();
    const { connection } = useConnection();
    const [ registeredSolanaDIDs, setRegisteredSolanaDIDs ] = useState<string[]>([]);
    const [ registeredEthereumDIDs, setRegisteredEthereumDIDs ] = useState<string[]>([]);
    const [ solanaKeyRegistry, setSolanaKeyRegistry ] = useState<Registry>();
    const [ ethereumKeyRegistry, setEthereumKeyRegistry ] = useState<EthRegistry>();

    const getRegisteredDIDsForEthAddress = useCallback(
      (ethAddress: string): Promise<string[]> => ReadOnlyRegistry.forEthAddress(ethAddress, connection, cluster).listDIDs()
      ,[connection]);

    const getRegisteredDIDsForAccount = useCallback(
      (account: PublicKey): Promise<string[]> => ReadOnlyRegistry.for(account, connection, cluster).listDIDs()
      ,[connection]);

    const loadDIDs = useCallback(() => {
        console.log("Loading DIDs")
        if (wallet.publicKey) {
            console.log("Found wallet public key " + wallet.publicKey.toBase58())
            getRegisteredDIDsForAccount(wallet.publicKey).then(setRegisteredSolanaDIDs);
            setSolanaKeyRegistry(Registry.for(wallet as Wallet, connection, cluster));
        } else {
            setRegisteredSolanaDIDs([]);
        }

        if (account) {
            console.log("Found Ethereum account " + account)
            getRegisteredDIDsForEthAddress(account).then(setRegisteredEthereumDIDs);
            setEthereumKeyRegistry(EthRegistry.forEthAddress(account, wallet as Wallet, connection, cluster));
        } else {
            setRegisteredEthereumDIDs([]);
        }
    }, [account, wallet, connection, setSolanaKeyRegistry, setEthereumKeyRegistry, setRegisteredSolanaDIDs, setRegisteredEthereumDIDs]);



    useEffect(loadDIDs, [account, wallet, connection]);

    return {
        registeredSolanaDIDs,
        registeredEthereumDIDs,
        solanaKeyRegistry,
        ethereumKeyRegistry,
        getRegisteredDIDsForEthAddress,
        getRegisteredDIDsForAccount,
        reload: loadDIDs,
    };
}
