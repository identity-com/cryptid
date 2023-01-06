import {createContext, FC, ReactNode, useCallback, useContext, useEffect, useState} from "react";
import {useConnection, useWallet} from "@solana/wallet-adapter-react";
import {
    addServiceToDID, addVerificationMethodToDID, isMigratable, isInitialized,
    keyToDid, migrate,
    removeServiceFromDID,
    removeVerificationMethodFromDID,
    resolveDID, getDIDAddress, getVerificationMethodFlags, registerDID, setOwned
} from "../lib/didUtils";
import {WalletAdapterNetwork} from "@solana/wallet-adapter-base";
import {DIDDocument} from "did-resolver";
import {PublicKey} from "@solana/web3.js";
import {
    AddVerificationMethodParams, DidSolIdentifier, ExtendedCluster,
    Service,
    VerificationMethodFlags, VerificationMethodType
} from "@identity.com/sol-did-client";
import { Web3Provider } from '@ethersproject/providers';
import { useWeb3React } from "@web3-react/core";
import {useRegistry} from "./useRegistry";
import { fromSolanaCluster } from "../lib/solanaUtils";

type DIDContextProps = {
    did: string;
    document: DIDDocument;
    linkedDIDs: string[];
    cluster: ExtendedCluster;
    registerDIDOnKey: () => Promise<void>;
    addKey: (key: AddVerificationMethodParams) => Promise<void>;
    removeKey: (fragment: string) => Promise<void>;
    getKeyFlags: (fragment: string) => Promise<VerificationMethodFlags | undefined>;
    setKeyOwned: (fragment: string, type: VerificationMethodType) => Promise<void>;
    addService: (service: Service) => Promise<void>;
    removeService: (fragment: string) => Promise<void>;
    migrateDID: () => Promise<void>;
    isDIDInitialized: () => Promise<boolean>;
    isLegacyDID: boolean | undefined;    // true if the DID refers to a "legacy" (v1 did:sol method) DID and needs migrating
    accountAddress: PublicKey | undefined;  // the address of the DID account if it is not a generative DID
}

const defaultDocument = {
    "@context": "https://w3id.org/did/v1",
    id: "",
    verificationMethod: [],
    service: [],
}

const defaultDIDContextProps: DIDContextProps = {
    did: "",
    document: defaultDocument,
    linkedDIDs: [],
    cluster: "mainnet-beta",
    registerDIDOnKey: async () => {},
    addKey: async (key: AddVerificationMethodParams) => {},
    removeKey: async (fragment: string) => {},
    getKeyFlags: async (fragment: string) => undefined,
    setKeyOwned: async (fragment: string, type: VerificationMethodType) => {},
    addService: async (service: Service) => {},
    removeService: async (fragment: string) => {},
    migrateDID: async () => {},
    isDIDInitialized: async () => false,
    isLegacyDID: undefined,
    accountAddress: undefined,
}
export const DIDContext = createContext<DIDContextProps>(defaultDIDContextProps)

export const DIDProvider: FC<{ children: ReactNode, network: WalletAdapterNetwork, setNetwork: (network : WalletAdapterNetwork) => void
}> = ({ children, network, setNetwork }) => {
    const wallet = useWallet();
    const { library } = useWeb3React<Web3Provider>();
    const {connection} = useConnection();
    const [document, setDocument] = useState<DIDDocument>();
    const [did, setDID] = useState<string>("");
    const [cluster, setCluster] = useState<ExtendedCluster>("mainnet-beta");
    const { registeredSolanaDIDs, registeredEthereumDIDs, reload} = useRegistry();
    const [linkedDIDs, setLinkedDIDs] = useState<string[]>([]);
    const [isLegacyDID, setIsLegacyDID] = useState<boolean>();
    const [accountAddress, setAccountAddress] = useState<PublicKey>();


    useEffect(() => {
        setCluster(network) // TODO: Maybe add some translation layer here.
    }, [network]);

    useEffect(() => {
        const mergedDIDs = [...registeredSolanaDIDs, ...registeredEthereumDIDs];
        // TODO this is a hack - clean up
        const didsOnNetwork = mergedDIDs.map(did => did.replace("did:sol:", `did:sol:${network}:`));
        setLinkedDIDs(didsOnNetwork);
    }, [registeredSolanaDIDs, registeredEthereumDIDs]);

    const loadDID = useCallback(() => {
        console.log("Loading DID", did);
        console.log("network is", network);
        if (did) {
            resolveDID(did, connection).then(setDocument).catch(console.error);
            isMigratable(did, connection).then(setIsLegacyDID)
            getDIDAddress(did, connection).then(setAccountAddress);
        }
    }, [did, wallet, network, connection])

    useEffect(() => {
        const matches = window.location.href.match(/\/(did:sol:.*)#?$/);
        if (matches) {
            console.log(`Found DID in URL: ${matches.map(m => m)}`);
            const identifier = DidSolIdentifier.parse(matches[1]);
            console.log(`Setting to ${identifier.toString(false)}`);
            const network = fromSolanaCluster(identifier.clusterType);
            console.log(`Setting network to ${network}`);
            if (network) {
                console.log(`Calling Setting network to ${network}`);
                setNetwork(network);
            }
            setDID(identifier.toString(false));
        } else if (wallet && wallet.publicKey) {
            const did = keyToDid(wallet.publicKey, network);
            setDID(did);
        }
    }, [wallet, network]);

    useEffect(() => {
        const location = window.location.href.match(/\/(did:sol:.*)#?$/);
        if (location) setDID(location[1]);
    }, [])

    useEffect(loadDID, [did, loadDID]);

    const getKeyFlags = (fragment: string) => getVerificationMethodFlags(did, wallet, fragment, connection)

    const addService = (service: Service) => addServiceToDID(did, wallet, service, connection).then(() => loadDID())

    const removeService = (fragment: string) => removeServiceFromDID(did, wallet, fragment, connection).then(() => loadDID())

    const addKey = (key: AddVerificationMethodParams) => addVerificationMethodToDID(did, wallet, key, connection).then(() => loadDID())

    const removeKey = (fragment: string) => removeVerificationMethodFromDID(did, wallet, fragment, connection).then(() => loadDID())

    const migrateDID = () => migrate(did, wallet, connection)
    const isDIDInitialized = () => isInitialized(did, connection);

    const registerDIDOnKey = () => registerDID(wallet, connection, did).then(reload)

    const setKeyOwned = (fragment: string, type: VerificationMethodType) => setOwned(fragment, type, did, wallet,
      connection, library?.getSigner()).then(loadDID)

    return (
        <DIDContext.Provider value={{
            did,
            document: document ?? defaultDocument,
            linkedDIDs,
            cluster,
            registerDIDOnKey,
            addKey,
            removeKey,
            getKeyFlags,
            setKeyOwned,
            addService,
            removeService,
            migrateDID,
            isDIDInitialized,
            isLegacyDID,
            accountAddress,
        }}>{children}</DIDContext.Provider>
    )
}

export const useDID = (): DIDContextProps => useContext(DIDContext);
