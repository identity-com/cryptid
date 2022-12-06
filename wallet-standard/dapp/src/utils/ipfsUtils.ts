import {CID, create as ipfsHttpClient} from "ipfs-http-client";
import {Web3Storage} from "./types";
import {MessageSignerWalletAdapter} from "@solana/wallet-adapter-base";

export const cidPathToUrl = (cidPath: string) => cidToHttpUrl(cidPath.replace(/^ipfs:\/\//, ''));
const cidToHttpUrl = (cid: string) => `https://ipfs.infura.io/ipfs/${cid}`;
const cidToUri = (cid: string) => `ipfs://${cid}`;

const ipfs = ipfsHttpClient({
    url: 'https://ipfs.infura.io:5001/api/v0'
})

export const addToIPFS = async (content: string, path: string, progressCallback: (percent: number) => void):Promise<CID> => {
    const result = await ipfs.add({
        path,
        content,
    }, {
        progress: (bytes) => progressCallback(bytes * 100 / content.length)
    });
    return result.cid;
}

export const retrieveFromIPFS = async (cid: string): Promise<string> => {
    const url = cidPathToUrl(cid);
    return fetch(url).then(res => res.text());
}

export class IPFSStorage implements Web3Storage {
    add(content: string, name: string, did: string, wallet: MessageSignerWalletAdapter, progressCallback: (percent: number) => void): Promise<string> {
        return addToIPFS(content, name, progressCallback).then(cid => cid.toString()).then(cidToUri);
    }

    retrieve(hash: string): Promise<string> {
        return retrieveFromIPFS(hash);
    }
}