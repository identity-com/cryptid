import {LexiWallet} from "@civic/lexi";
import {MessageSignerWalletAdapter} from "@solana/wallet-adapter-base";

const generateSeed = () => window.crypto.getRandomValues(new Uint8Array(32));

export type EncryptedPayload = {
    jwe: string;
    seed: string;
    name: string;
    mimeType: string;
}

export type UnencryptedPayload = {
    data: Uint8Array;
    name: string;
    mimeType: string;
}

export const encrypt = async (unencryptedPayload: UnencryptedPayload, did: string, wallet: MessageSignerWalletAdapter): Promise<EncryptedPayload> => {
    const seed = Buffer.from(generateSeed()).toString('hex');
    const lexi = new LexiWallet(wallet, did, {publicSigningString: seed})

    const jwe = await lexi.encryptForMe({
        data: new Buffer(unencryptedPayload.data).toString('base64'),
        name: unencryptedPayload.name,
        mimeType: unencryptedPayload.mimeType,
    });

    return {
        jwe,
        seed,
        name: unencryptedPayload.name,
        mimeType: unencryptedPayload.mimeType,
    }
}

export const decrypt = async (payload: EncryptedPayload, did: string, wallet: MessageSignerWalletAdapter): Promise<UnencryptedPayload> => {
    const lexi = new LexiWallet(wallet, did, {publicSigningString: payload.seed})

    const decryptedPayload = (await lexi.decrypt(payload.jwe)) as Omit<UnencryptedPayload, 'data'> & {data: string}

    return {
        data: Buffer.from(decryptedPayload.data, 'base64'),
        name: payload.name,
        mimeType: payload.mimeType,
    };
}