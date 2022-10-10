import { PublicKey } from "@solana/web3.js";
import {
  DidSolIdentifier,
  DidSolService,
  BitwiseVerificationMethodFlag,
  VerificationMethodType,
} from "@identity.com/sol-did-client";
import { CLUSTER } from "./constants";
import { Wallet } from "./anchorUtils";

export const addKeyToDID = async (authority: Wallet, key: PublicKey) => {
  const did = DidSolIdentifier.create(authority.publicKey, CLUSTER);
  const didSolService = DidSolService.build(did, {
    wallet: authority,
  });
  const newKeyVerificationMethod = {
    flags: [BitwiseVerificationMethodFlag.CapabilityInvocation],
    fragment: `key${Date.now()}`, // randomise fragment name, so that we can add multiple keys in multiple tests.
    keyData: key.toBytes(),
    methodType: VerificationMethodType.Ed25519VerificationKey2018,
  };

  await didSolService.addVerificationMethod(newKeyVerificationMethod).rpc(); //{ skipPreflight: true, commitment: 'finalized' });
};

export const initializeDIDAccount = async (
  authority: Wallet
): Promise<[PublicKey, number]> => {
  const did = DidSolIdentifier.create(authority.publicKey, CLUSTER);
  const didSolService = await DidSolService.build(did, {
    wallet: authority,
  });

  await didSolService.initialize(10_000).rpc();
  return did.dataAccount();
};

export const getDidAccount = async (
  authority: Wallet
): Promise<[PublicKey, number]> => {
  const did = DidSolIdentifier.create(authority.publicKey, CLUSTER);
  return did.dataAccount();
};

export enum DidTestType {
  Generative = "generative DID",
  Initialized = "initialized DID",
}

export const didTestCases = [
  {
    type: DidTestType.Generative,
    beforeFn: async (authority: Wallet) => await getDidAccount(authority),
  },
  {
    type: DidTestType.Initialized,
    beforeFn: async (authority: Wallet) =>
      await initializeDIDAccount(authority),
  },
];
