import {solana} from "@civic/aleph-sdk-ts/accounts";
import {SolanaWallet} from "@civic/aleph-sdk-ts/accounts/solana";
import {Account} from "@civic/aleph-sdk-ts/accounts/account";
import {Publish} from "@civic/aleph-sdk-ts/messages/store";
import {DEFAULT_API_V2} from "@civic/aleph-sdk-ts/global";
import {ItemType} from "@civic/aleph-sdk-ts/messages/message";
import {store} from "@civic/aleph-sdk-ts";
import {Web3Storage} from "./types";
import {MessageSignerWalletAdapter} from "@solana/wallet-adapter-base";

const uriToHash = (uri: string) => uri.replace(/^.*:\/\//, '');
const hashToUri = (hash: string) => `aleph://${hash}`;

const arraybufferToString = (ab: ArrayBuffer): string => new TextDecoder().decode(ab);

const createAccount = async (wallet: MessageSignerWalletAdapter): Promise<Account> => {
    if (!wallet.publicKey) throw new Error("Wallet is not ready");

    const walletObj: SolanaWallet = {
        publicKey: wallet.publicKey,
        signMessage: wallet.signMessage,
    }
    return new solana.SOLAccount(walletObj);
}

export const addToAleph = async (wallet: MessageSignerWalletAdapter, content: string): Promise<string> => {
    const alephAccount = await createAccount(wallet);

    // account from the aleph integration tests
    // const mnemonic = "twenty enough win warrior then fiction smoke tenant juice lift palace inherit";
    // const alephAccount = ethereum.ImportAccountFromMnemonic(mnemonic);

    const fileContent = Buffer.from(content);
    const storeMessage = await Publish({
        channel: "TEST",
        APIServer: DEFAULT_API_V2,
        account: alephAccount,
        storageEngine: ItemType.storage,
        fileObject: fileContent,
    })

    return storeMessage.content.item_hash;
}

export const retrieveFromAleph = async (uri: string):Promise<string> => {
    const response = await store.Get({
        fileHash: uriToHash(uri),
        APIServer: DEFAULT_API_V2,
    });
    return arraybufferToString(response);
}

export class AlephStorage implements Web3Storage {
    add(content: string, name: string, did: string, wallet: MessageSignerWalletAdapter, progressCallback: (percent: number) => void): Promise<string> {
        return addToAleph(wallet, content).then(hashToUri);
    }

    retrieve(hash: string): Promise<string> {
        return retrieveFromAleph(hash);
    }
}