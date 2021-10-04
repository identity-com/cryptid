import {DIDDocument} from "did-resolver";
import {createTransaction, registerInstructionIfNeeded} from "../util";
import {createUpdateInstruction, DecentralizedIdentifier, MergeBehaviour} from "@identity.com/sol-did-client";
import {filterNotNil} from "../../../util";
import {Connection, PublicKey, Transaction} from "@solana/web3.js";
import {Signer} from "../../../../types/crypto";

/**
 * Creates a transaction that updates a DID Document.
 *
 * This transaction will either contain a register instruction (if the DID is not yet registered on chain)
 * or an update instruction (if it is already registered), but not both
 * @param did
 * @param document
 * @param connection
 * @param payer
 * @param signers
 * @param mergeBehaviour
 */
export const registerOrUpdate = async (did: string, document: Partial<DIDDocument>, connection: Connection, payer: PublicKey, signers: Signer[], mergeBehaviour: MergeBehaviour = 'Append'):Promise<Transaction> => {
  // if the did is not registered, register it with the new document
  // if the did is registered, this will return null
  const registerInstruction = await registerInstructionIfNeeded(
    connection,
    did,
    payer,
    document
  );

  let instructions = [registerInstruction];

  // if the did is registered, update it
  if (!registerInstruction) {
    const updateInstruction = await createUpdateInstruction({
      authority: await DecentralizedIdentifier.parse(
        did
      ).authorityPubkey.toPublicKey(),
      identifier: did,
      document,
      mergeBehaviour
    });
    instructions = [updateInstruction];
  }

  const recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

  return createTransaction(recentBlockhash, filterNotNil(instructions), payer, signers);
}

export type DIDComponent = { id : string }
export const hasAlias = (alias:string) => (component: DIDComponent):boolean => component.id.substring(component.id.indexOf('#') + 1) === alias;
