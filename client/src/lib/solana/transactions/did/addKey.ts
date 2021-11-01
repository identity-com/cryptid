import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { makeVerificationMethod } from '../../../did';
import { resolve } from '@identity.com/sol-did-client';
import { Signer } from '../../../../types/crypto';
import { DIDOperationPayer, isDefault, registerOrUpdate } from './util';
import { DIDDocument, VerificationMethod } from 'did-resolver';

const updatedCapabilityInvocation = (
  existingDocument: DIDDocument,
  newVerificationMethod: VerificationMethod
) => {
  if (!existingDocument.capabilityInvocation) {
    return [newVerificationMethod.id];
  }

  if (existingDocument.capabilityInvocation.length === 1) {
    if (isDefault(existingDocument.capabilityInvocation[0])) {
      // this is added by default when capabilityInvocation is empty on chain
      // when adding a new one, include it to avoid overwriting
      return [
        ...existingDocument.capabilityInvocation,
        newVerificationMethod.id,
      ];
    }
  }

  // no need to add existing capabilityInvocations as we are using merge behaviour "append"

  return [newVerificationMethod.id];
};

/**
 * Creates a transaction that adds a key to a DID.
 *
 * This transaction will either contain a register instruction (if the DID is not yet registered on chain)
 * or an update instruction (if it is already registered), but not both
 */
export const addKey = async (
  connection: Connection,
  did: string,
  payer: DIDOperationPayer,
  newKey: PublicKey,
  alias: string,
  authority: Signer
): Promise<Transaction> => {
  // resolve the existing document so that any existing capability invocation keys can be included in the registered version
  // if this is missed, registering with a new key removes the old key, which we don't want in this case.
  const existingDocument = await resolve(did, { connection });
  const verificationMethod = makeVerificationMethod(did, newKey, alias);
  const document = {
    verificationMethod: [verificationMethod],
    capabilityInvocation: updatedCapabilityInvocation(
      existingDocument,
      verificationMethod
    ),
  };

  return registerOrUpdate(did, document, connection, payer, authority);
};
