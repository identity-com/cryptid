import {Connection, PublicKey, Transaction, TransactionInstruction} from "@solana/web3.js";
import {
    DidSolDataAccount,
    DidSolIdentifier,
    DidSolService,
    ExtendedCluster,
    Service,
    VerificationMethodFlags,
    Wallet,
    BitwiseVerificationMethodFlag, AddVerificationMethodParams, VerificationMethodType, EthSigner,
} from "@identity.com/sol-did-client";
import {WalletContextState} from "@solana/wallet-adapter-react/src/useWallet";
import { sendTransaction, toSolanaCluster } from "./solanaUtils";
import {WalletAdapterNetwork} from "@solana/wallet-adapter-base";
import {DIDDocument, ServiceEndpoint, VerificationMethod as DIDVerificationMethod} from "did-resolver";
import {Registry} from '@civic/did-registry'

export const registerDID = (wallet: WalletContextState, connection: Connection, did: string): Promise<string> => {
    const registry = Registry.for(toWallet(wallet), connection);

    return registry.register(did);
}

const toWallet = (walletContextState: WalletContextState):Wallet => {
    if (!walletContextState.publicKey || !walletContextState.signTransaction || !walletContextState.signAllTransactions) {
        throw Error("Unsupported wallet type");
    }

    return {
        publicKey: walletContextState.publicKey,
        signTransaction(tx: Transaction): Promise<Transaction> {
            return walletContextState.signTransaction!(tx);
        },
        signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
            return walletContextState.signAllTransactions!(txs);
        }
    };
}

const getService = (authority: PublicKey, clusterType: ExtendedCluster, wallet?: WalletContextState, connection?: Connection) =>
    DidSolService.build(
        new DidSolIdentifier({authority, clusterType}),
        { wallet: wallet ? toWallet(wallet) : undefined, connection }
    );

const getServiceFromDID = (did: string, wallet?: WalletContextState, connection?: Connection) => DidSolService.build(
    DidSolIdentifier.parse(did),
    { wallet: wallet ? toWallet(wallet) : undefined, connection }
    );

export const keyToDid = (key: PublicKey, network: WalletAdapterNetwork): string => {
    const cluster = toSolanaCluster(network);
    return DidSolIdentifier.create(key, cluster).toString();
}
export const findPFP = (document: DIDDocument): string | undefined => document.service?.find(s => s.type === 'PFP')?.serviceEndpoint

export const isVerificationMethod = (entry: DIDVerificationMethod | ServiceEndpoint): entry is DIDVerificationMethod => entry.hasOwnProperty('controller');

export const resolveDID = (did: string, connection: Connection): Promise<DIDDocument> => getServiceFromDID(did, undefined, connection).resolve();

const sendInstruction = async (instruction: TransactionInstruction, wallet: WalletContextState, connection: Connection): Promise<string> => {
    const latestBlockhash = await connection.getLatestBlockhash()
    const signature = await sendTransaction([instruction], wallet, connection, latestBlockhash)
    await connection.confirmTransaction({
        signature,
        blockhash: 'latest',
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    });
    return signature;
}

export const addServiceToDID = async (did: string, wallet: WalletContextState, service: Service, connection: Connection): Promise<void> => {
    if (!wallet.publicKey) throw new Error('Wallet is not connected');

    const didSolService = await getServiceFromDID(did, wallet, connection);

    await didSolService.addService(service).withAutomaticAlloc(wallet.publicKey).rpc();
}
export const removeServiceFromDID = async (did: string, wallet: WalletContextState, identifier: string, connection: Connection): Promise<void> => {
    if (!wallet.publicKey) throw new Error('Wallet is not connected');

    const didSolService = await getServiceFromDID(did, wallet, connection);

    const fragment = identifier.match(/^did:sol:.*#(.*)$/)?.[1];
    if (!fragment) throw new Error(`Invalid identifier: ${identifier}`);

    await didSolService.removeService(fragment).rpc();
}

export const getVerificationMethodFlags = async (did: string, wallet: WalletContextState, fragment: string, connection: Connection): Promise<VerificationMethodFlags | undefined> => {
    if (!wallet.publicKey) throw new Error('Wallet is not connected');

    const didSolService = await getServiceFromDID(did, wallet, connection);

    const account = await didSolService.getDidAccount();

    if (!account) return undefined;

    return account.verificationMethods.find(vm => vm.fragment === fragment)?.flags;
}

export const addVerificationMethodToDID = async (did: string, wallet: WalletContextState, key: AddVerificationMethodParams, connection: Connection): Promise<void> => {
    if (!wallet.publicKey) throw new Error('Wallet is not connected');

    const didSolService = await getServiceFromDID(did, wallet, connection);

    await didSolService.addVerificationMethod(key).withAutomaticAlloc(wallet.publicKey).rpc();
}

export const removeVerificationMethodFromDID = async (did: string, wallet: WalletContextState, identifier: string, connection: Connection): Promise<void> => {
    if (!wallet.publicKey) throw new Error('Wallet is not connected');

    const fragment = identifier.match(/^did:sol:.*#(.*)$/)?.[1];
    if (!fragment) throw new Error(`Invalid identifier: ${identifier}`);

    const didSolService = await getServiceFromDID(did, wallet, connection);

    await didSolService.removeVerificationMethod(fragment).rpc();
}

export const setOwned = async (fragment: string, type: VerificationMethodType, did: string, wallet: WalletContextState, connection: Connection, ethSigner?: EthSigner): Promise<void> => {
    if (!wallet.publicKey) throw new Error('Wallet is not connected');

    // Why is this required? Did we not read the state when initializing the service?
    const didSolService = await getServiceFromDID(did, wallet, connection);
    // get current flags
    const flags = await getVerificationMethodFlags(did, wallet, fragment, connection) || VerificationMethodFlags.none();
    // set Ownership flag
    flags.set(BitwiseVerificationMethodFlag.OwnershipProof);

    // get Nonce
    // const nonce = await didSolService.getNonce();
    // console.log(`Nonce: ${nonce}`);
    // console.log(`Flags: ${nonce.toBuffer('le', 8)}`);

    // Prepare prepare setVM Instruction
    didSolService.setVerificationMethodFlags(fragment, flags.array, wallet.publicKey);

    if (type !== VerificationMethodType.Ed25519VerificationKey2018 && ethSigner) {
        // Assume Eth Signature required
        didSolService.withEthSigner(ethSigner)
    }

    await didSolService.rpc();
}

export const isMigratable = async (did: string, connection: Connection): Promise<boolean> => {
    const didSolService = await getServiceFromDID(did, undefined, connection);

    return didSolService.isMigratable();
}

export const migrate = async (did: string, wallet: WalletContextState, connection: Connection) : Promise<void> => {
    console.log({
        did,
        wallet
    })
    if (!wallet.publicKey) throw new Error('Wallet is not connected');

    const didSolService = await getServiceFromDID(did, wallet, connection);

    const isMigratable = await didSolService.isMigratable();
    if (!isMigratable) throw new Error('DID is not migratable');

    await didSolService.migrate().rpc();
}

export const getDIDAccount = async (did: string, connection: Connection) : Promise<DidSolDataAccount | null> => {
    const didSolService = await getServiceFromDID(did, undefined, connection);
    return didSolService.getDidAccount();
}

export const getDIDAddress = async (did:string, connection: Connection): Promise<PublicKey | undefined> => {
    if (!await isInitialized(did, connection)) return undefined;

    const didSolService = await getServiceFromDID(did, undefined, connection);
    return didSolService.didDataAccount;
}

export const isInitialized = (did: string, connection: Connection): Promise<boolean> => getDIDAccount(did, connection).then(account => !!account);
