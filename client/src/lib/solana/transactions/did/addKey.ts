import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { makeVerificationMethod } from '../../../did';
import { resolve } from '@identity.com/sol-did-client';
import {DynamicSigner} from '../../../../types/crypto';
import {registerOrUpdate} from "./util";

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
  signers: DynamicSigner[]
): Promise<Transaction> => {
  // resolve the existing document so that any existing capability invocation keys can be included in the registered version
  // if this is missed, registering with a new key removes the old key, which we don't want in this case.
  const existingDocument = await resolve(did);
  const verificationMethod = makeVerificationMethod(did, newKey, alias);
  const document = {
    verificationMethod: [verificationMethod],
    capabilityInvocation: [
      ...(existingDocument.capabilityInvocation || []),
      verificationMethod.id,
    ],
  };

  return registerOrUpdate(did, document, connection, payer, signers);
};
