// Functions exposing the DID API
import {DidSolIdentifier, DidSolService} from "@identity.com/sol-did-client";
import {Wallet} from "../types/crypto";
import {Connection, PublicKey} from "@solana/web3.js";

export const didService = (did: DidSolIdentifier, connection: Connection, wallet: Wallet) => {
    // TODO Add connection
    return DidSolService.build(did, undefined, wallet);
}

export const didToPublicKey = (did: string): PublicKey =>
    DidSolIdentifier.parse(did).authority;

export const didToPDA = (did: string): Promise<PublicKey> =>
    // TODO make dataAccount synchronous
    DidSolIdentifier.parse(did).dataAccount().then(dataAccount => dataAccount[0]);
