import {DIDDocument, VerificationMethod} from "did-resolver";
import {createTransaction, registerInstructionIfNeeded} from "../util";
import {createUpdateInstruction, MergeBehaviour} from "@identity.com/sol-did-client";
import {filterNotNil} from "../../../util";
import {Connection, PublicKey, Transaction} from "@solana/web3.js";
import {Signer} from "../../../../types/crypto";
import {didToPublicKey} from "../../util";
import {has, filter} from "ramda";

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
      authority: didToPublicKey(did),
      identifier: did,
      document,
      mergeBehaviour,
      connection
    });
    instructions = [updateInstruction];
  }

  const recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

  return createTransaction(recentBlockhash, filterNotNil(instructions), payer, signers);
}

export type DIDComponent = { id : string }

const isDIDComponent = (component: DIDComponent | string): component is DIDComponent => has('id', component)

// true if a did component or reference to one has an alias (defined as the did url fragment)
// note - the DID itself is not checked here, just the fragment.
export const hasAlias = (alias:string) => (component: DIDComponent | string):boolean =>
  isDIDComponent(component) ?
  component.id.endsWith(`#${alias}`) : // DIDComponent case ID must match #alias
  component.endsWith(`#${alias}`); // string case - must match #alias

export const findVerificationMethodWithAlias = (document: Partial<DIDDocument>, alias:string):VerificationMethod|undefined =>
  document.verificationMethod?.find(hasAlias(alias));

// filter default keys from capability invocation and verification method
// if they are the only ones, as they are added by the client by default, and do not need
// to be stored on chain
export const sanitizeDefaultKeys = (document: Partial<DIDDocument>):void => {
  if (document.verificationMethod?.length === 1 && hasAlias('default')(document.verificationMethod[0])) {
    delete document.verificationMethod;
  }
  if (document.capabilityInvocation?.length === 1 && hasAlias('default')(document.capabilityInvocation[0])) {
    delete document.capabilityInvocation;
  }

  if (document.verificationMethod && findVerificationMethodWithAlias(document, 'default')) {
    document.verificationMethod = filter((x: VerificationMethod | string) => !(hasAlias('default')(x)), document.verificationMethod);
  }

  if (document.capabilityInvocation) {
    document.capabilityInvocation = filter((x: VerificationMethod | string) => !(hasAlias('default')(x)), document.capabilityInvocation);
  }
}
