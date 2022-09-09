// Functions exposing the DID API
import {DidSolIdentifier, DidSolService} from "@identity.com/sol-did-client";
import {Wallet} from "../types/crypto";
import {Connection} from "@solana/web3.js";

export const didService = (did: DidSolIdentifier, connection: Connection, wallet: Wallet) => {
    // TODO Add connection
    return DidSolService.build(did, undefined, wallet);
}