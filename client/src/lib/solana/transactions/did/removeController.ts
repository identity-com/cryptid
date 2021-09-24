import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Signer } from '../../../../types/crypto';
import {registerOrUpdate} from "./util";
import {DIDDocument} from "did-resolver";
import {resolve} from "@identity.com/sol-did-client";
import {filterNotNil} from "../../../util";
import {flatten, without} from "ramda";

const hasController = (document: DIDDocument, controller: string):boolean => {
  if (!document.controller) return false;

  if (Array.isArray(document.controller)) {
    return document.controller.includes(controller)
  }

  return document.controller === controller;
}

/**
 * Creates a transaction that removes a controller to a DID.
 *
 * This transaction will either contain a register instruction (if the DID is not yet registered on chain)
 * or an update instruction (if it is already registered), but not both
 */
export const removeController = async (
  connection: Connection,
  did: string,
  payer: PublicKey,
  controller: string,
  signers: Signer[]
): Promise<Transaction> => {
  const existingDocument = await resolve(did);

  if (!hasController(existingDocument, controller)) throw new Error(`Controller ${controller} not found on ${did}`);

  // remove the controller from the list
  const newControllers = without([controller], filterNotNil(flatten([existingDocument.controller])));

  const document: Partial<DIDDocument> = {
    controller: newControllers
  };

  return registerOrUpdate(did, document, connection, payer, signers);
};
