import {WalletContextState} from "@solana/wallet-adapter-react";
import {Keypair} from "@solana/web3.js";
import nacl from "tweetnacl";
import {addToAleph, retrieveFromAleph} from "./alephUtils";
import {MessageSignerWalletAdapter} from "@solana/wallet-adapter-base";

describe('alephUtils', () => {
    const createWallet = () => {
        const keypair = Keypair.generate();
        return {
            publicKey: keypair.publicKey,
            signMessage: async (message: Uint8Array): Promise<Uint8Array> => nacl.sign.detached(message, keypair.secretKey),
        } as MessageSignerWalletAdapter;
    }

    const content = "Hello World";

    it('should store a file', async () => {
        const hash = await addToAleph(createWallet(), content);
        const file = await retrieveFromAleph(hash);

        expect(file).toBe(content);
    }, 20_000)

    it('should retrieve an old stored file', async () => {
        const file = await retrieveFromAleph('a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e');
        expect(file).toBe(content);
    })
});