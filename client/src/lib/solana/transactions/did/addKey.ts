import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import {makeVerificationMethod} from "../../../did";
import {createUpdateInstruction} from "@identity.com/sol-did-client";
import {Signer} from "../../../../types/crypto";
import {createAndSignTransaction, registerInstructionIfNeeded} from "../util";
import {notNil} from "../../../util";

/**
 * Creates a transaction that adds a key to a DID.
 *
 * This transaction will either contain a register instruction (if the DID is not yet registered on chain)
 * or an update instruction (if it is already registered), but not both
 */
export const addKey = async (
  connection: Connection,
  did: string,
  payer: PublicKey,
  newKey: PublicKey,
  alias: string,
  signers: Signer[],
): Promise<Transaction> => {
  const verificationMethod = makeVerificationMethod(did, newKey, alias)
  const document = {
    verificationMethod: [verificationMethod],
    capabilityInvocation: [verificationMethod.id],
  };

  // if the did is not registered, register it with the new key
  // if the did is registered, this will return null
  const registerInstruction = await registerInstructionIfNeeded(connection, did, signers[0], document)

  let instructions = [registerInstruction];

  // if the did is registered, update it
  if (!registerInstruction) {
    const updateInstruction = await createUpdateInstruction({
      authority: signers[0].publicKey,
      identifier: did,
      document,
    });
    instructions = [updateInstruction];
  }

  return createAndSignTransaction(
    connection,
    notNil(instructions),
    payer,
    signers
  );
};
