import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Signer } from '../../../../types/crypto';
import {hasAlias, registerOrUpdate} from "./util";
import {DIDDocument, ServiceEndpoint} from "did-resolver";
import {resolve} from "@identity.com/sol-did-client";
import {pick, without} from "ramda";

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
  const existingDocument = await resolve(did, { connection });
  const serviceToRemove = findServiceWithAlias(existingDocument, alias);

  if (!serviceToRemove) throw new Error(`Service ${alias} not found on ${did}`);

  // get the new list of services without the one being removed.
  // the cast is safe here as if the service array did not exist, it would fail above
  const newServices = without([serviceToRemove], existingDocument.service as ServiceEndpoint[]);

  const document: Partial<DIDDocument> = {
    ...(pick([
      'verificationMethod',
      'authentication',
      'assertionMethod',
      'keyAgreement',
      'capabilityInvocation',
      'capabilityDelegation',
      'controller',
    ], existingDocument)),
    // remove the service property if empty. note this works only with mergeBehaviour "Overwrite"
    service: newServices.length ? newServices : undefined
  };

  return registerOrUpdate(did, document, connection, payer, signers, 'Overwrite');
};
