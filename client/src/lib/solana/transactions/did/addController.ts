import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Signer } from '../../../../types/crypto';
import {registerOrUpdate} from "./util";
import {DIDDocument} from "did-resolver";
import {resolve} from "@identity.com/sol-did-client";
import {filterNotNil} from "../../../util";
import {flatten, uniq} from "ramda";

/**
 * Creates a transaction that adds a controller to a DID.
 *
 * This transaction will either contain a register instruction (if the DID is not yet registered on chain)
 * or an update instruction (if it is already registered), but not both
 */
export const addController = async (
  connection: Connection,
  did: string,
  payer: PublicKey,
  controller: string,
  signers: Signer[]
): Promise<Transaction> => {
  const existingDocument = await resolve(did, { connection });

  // add the new controller to the list
  const newControllers = uniq(filterNotNil(flatten([controller, ...[existingDocument.controller]])))

  const document: Partial<DIDDocument> = {
    controller: newControllers
  };

  return registerOrUpdate(did, document, connection, payer, signers);
};
