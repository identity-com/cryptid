// Functions exposing the DID API
import {DidSolIdentifier, DidSolService} from "@identity.com/sol-did-client";
import {Wallet} from "../types/crypto";
import {Connection, PublicKey} from "@solana/web3.js";

export const didService = (did: DidSolIdentifier, connection: Connection, wallet: Wallet) => {
  return DidSolService.build(did, {
    connection,
    wallet
  });
}

export const didToPublicKey = (did: string): PublicKey =>
  DidSolIdentifier.parse(did).authority;

export const didToPDA = (did: string): PublicKey =>
  DidSolIdentifier.parse(did).dataAccount()[0];
