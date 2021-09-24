import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Signer } from '../../../../types/crypto';
import {hasAlias, registerOrUpdate} from "./util";
import {DIDDocument, ServiceEndpoint} from "did-resolver";
import {resolve} from "@identity.com/sol-did-client";
import {without} from "ramda";

const findServiceWithAlias = (document: DIDDocument, alias:string):ServiceEndpoint|undefined =>
  document.service?.find(hasAlias(alias));

/**
 * Creates a transaction that removes a service from a DID.
 */
export const removeService = async (
  connection: Connection,
  did: string,
  payer: PublicKey,
  alias: string,
  signers: Signer[]
): Promise<Transaction> => {
  const existingDocument = await resolve(did);
  const serviceToRemove = findServiceWithAlias(existingDocument, alias);

  if (!serviceToRemove) throw new Error(`Key ${alias} not found on ${did}`);

  const document: Partial<DIDDocument> = {
    service: existingDocument.service && without([serviceToRemove], existingDocument.service)
  };

  return registerOrUpdate(did, document, connection, payer, signers);
};
