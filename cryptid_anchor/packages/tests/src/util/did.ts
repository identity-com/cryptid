import {PublicKey} from "@solana/web3.js";
import {
    DidSolIdentifier,
    DidSolService,
    VerificationMethodFlags,
    VerificationMethodType
} from "@identity.com/sol-did-client";
import {CLUSTER} from "./constants";
import {Wallet} from "./anchorUtils";

export const addKeyToDID = async (authority: Wallet, key: PublicKey) => {
    const did = DidSolIdentifier.create(authority.publicKey, CLUSTER);
    const didSolService = await DidSolService.build(did, undefined, authority);
    const newKeyVerificationMethod = {
        flags: VerificationMethodFlags.CapabilityInvocation,
        fragment: `key${Date.now()}`, // randomise fragment name, so that we can add multiple keys in multiple tests.
        keyData: key.toBytes(),
        methodType: VerificationMethodType.Ed25519VerificationKey2018
    };

    await didSolService.addVerificationMethod(newKeyVerificationMethod).rpc()//{ skipPreflight: true, commitment: 'finalized' });
}

export const getDIDAccount = (authority: PublicKey): Promise<PublicKey> => {
    const did = DidSolIdentifier.create(authority, CLUSTER);
    return did.dataAccount().then(([account]) => account);
}

export const initializeDIDAccount = async (authority: Wallet): Promise<PublicKey> => {
    const did = DidSolIdentifier.create(authority.publicKey, CLUSTER);
    const didSolService = await DidSolService.build(did, undefined, authority);

    await didSolService.initialize(10_000).rpc();
    return did.dataAccount().then(([account]) => account);
}