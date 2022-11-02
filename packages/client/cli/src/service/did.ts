import { Connection, PublicKey } from "@solana/web3.js";
import {
  BitwiseVerificationMethodFlag,
  DidSolIdentifier,
  DidSolService,
  VerificationMethodType,
  Wallet,
} from "@identity.com/sol-did-client";
import { ExtendedCluster } from "@identity.com/cryptid-hh";

export const addKeyToDID = async (
  authority: Wallet,
  key: PublicKey,
  name: string,
  cluster: ExtendedCluster,
  connection: Connection
) => {
  const did = DidSolIdentifier.create(authority.publicKey, cluster);
  const didSolService = DidSolService.build(did, {
    wallet: authority,
    connection,
  });
  const newKeyVerificationMethod = {
    flags: [BitwiseVerificationMethodFlag.CapabilityInvocation],
    fragment: name,
    keyData: key.toBytes(),
    methodType: VerificationMethodType.Ed25519VerificationKey2018,
  };

  await didSolService
    .addVerificationMethod(newKeyVerificationMethod)
    .withAutomaticAlloc(authority.publicKey)
    .rpc();
};

export const removeKeyFromDID = async (
  authority: Wallet,
  name: string,
  cluster: ExtendedCluster,
  connection: Connection
) => {
  const did = DidSolIdentifier.create(authority.publicKey, cluster);
  const didSolService = DidSolService.build(did, {
    wallet: authority,
    connection,
  });
  await didSolService.removeVerificationMethod(name).rpc();
};
