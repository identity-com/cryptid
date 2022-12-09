import { Keypair, PublicKey } from "@solana/web3.js";
import {
  BitwiseVerificationMethodFlag,
  DidSolIdentifier,
  DidSolService,
  Service,
  VerificationMethodType,
} from "@identity.com/sol-did-client";
import { CLUSTER } from "./constants";
import { Wallet } from "./anchorUtils";
import { utils, Wallet as EthWallet } from "ethers";

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

export const setControllersOnDid = async (
  authority: Wallet,
  controllers: string[]
) => {
  const did = DidSolIdentifier.create(authority.publicKey, CLUSTER);
  const didSolService = DidSolService.build(did, {
    wallet: authority,
  });
  await didSolService.setControllers(controllers).rpc();
};

export const addEthKeyWithOwnershipToDID = async (authority: Wallet) => {
  const did = DidSolIdentifier.create(authority.publicKey, CLUSTER);
  const didSolService = DidSolService.build(did, {
    wallet: authority,
  });

  // Create a DID Wallet
  const newEthKey = EthWallet.createRandom();
  const fragment = `eth-key${Date.now()}`;
  const newKeyVerificationMethod = {
    flags: [BitwiseVerificationMethodFlag.CapabilityInvocation],
    fragment,
    keyData: Buffer.from(utils.arrayify(newEthKey.address)),
    methodType: VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020,
  };

  // Set VM
  await didSolService.addVerificationMethod(newKeyVerificationMethod).rpc();

  // Set Ownership flags
  await didSolService
    .setVerificationMethodFlags(fragment, [
      BitwiseVerificationMethodFlag.CapabilityInvocation,
      BitwiseVerificationMethodFlag.OwnershipProof,
    ])
    .withEthSigner(newEthKey)
    .rpc();
};

export const addServiceToDID = async (authority: Wallet, service: Service) => {
  const did = DidSolIdentifier.create(authority.publicKey, CLUSTER);
  const didSolService = DidSolService.build(did, {
    wallet: authority,
  });

  await didSolService.addService(service).rpc();
};

export const initializeDIDAccount = async (
  authority: Wallet,
  payer?: Wallet
): Promise<[PublicKey, number]> => {
  const did = DidSolIdentifier.create(authority.publicKey, CLUSTER);
  const didSolService = await DidSolService.build(did, {
    wallet: authority,
  });

  await didSolService.initialize(10_000, payer?.publicKey).rpc();
  return did.dataAccount();
};

export const getDidAccount = async (
  authority: Wallet
): Promise<[PublicKey, number]> => {
  const did = DidSolIdentifier.create(authority.publicKey, CLUSTER);
  return did.dataAccount();
};

export enum TestType {
  Generative = "generative",
  Initialized = "non-generative",
}

export const didTestCases = [
  {
    didType: TestType.Generative,
    getDidAccount: async (authority: Wallet) => await getDidAccount(authority),
  },
  {
    didType: TestType.Initialized,
    getDidAccount: async (authority: Wallet) =>
      await initializeDIDAccount(authority),
  },
];
