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

// filter the default key from capability invocation and verification method
// If it is the only one in the capabilityInvocation array, it is inferred by default by the program,
// and therefore does not need to be stored on chain.
// It never needs to be stored on chain in the verificationMethod array, as it is always inferred
export const sanitizeDefaultKeys = (document: Partial<DIDDocument>):void => {
  // if verificationMethod contains the default key, remove it (it is always added by default)
  if (document.verificationMethod && findVerificationMethodWithAlias(document, 'default')) {
    document.verificationMethod = filter((x: VerificationMethod | string) => !(hasAlias('default')(x)), document.verificationMethod);

    // if this now means the verification method array is empty, remove the array
    if (document.verificationMethod.length === 0) {
      delete document.verificationMethod;
    }
  }

  if (document.capabilityInvocation?.length === 1 && hasAlias('default')(document.capabilityInvocation[0])) {
    delete document.capabilityInvocation;
  }


}
