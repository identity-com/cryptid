import { Connection, Transaction } from '@solana/web3.js';
import { resolve } from '@identity.com/sol-did-client';
import { Signer } from '../../../../types/crypto';
import { DIDDocument } from 'did-resolver';
import { pick, without } from 'ramda';
import {
  DIDOperationPayer,
  findVerificationMethodWithAlias,
  isDefault,
  registerOrUpdate,
  sanitizeDefaultKeys,
} from './util';

/**
 * Creates a transaction that removes a key to a DID.
 *
 * The key is removed by alias (did url fragment). If the key alias is not present on the DID,
 * an error is thrown.
 */
export const removeKey = async (
  connection: Connection,
  did: string,
  payer: DIDOperationPayer,
  alias: string,
  authority: Signer
): Promise<Transaction> => {
  const existingDocument = await resolve(did, { connection });
  const verificationMethodToRemove = findVerificationMethodWithAlias(
    existingDocument,
    alias
  );

  if (!verificationMethodToRemove)
    throw new Error(`Key ${alias} not found on ${did}`);

  // to save space on-chain, do not register properties that were unchanged or not registered in the existing doc
  const document: Partial<DIDDocument> = {
    ...pick(['controller', 'service'], existingDocument),
    assertionMethod:
      existingDocument.assertionMethod &&
      without(
        [verificationMethodToRemove.id],
        existingDocument.assertionMethod
      ),
    authentication:
      existingDocument.authentication &&
      without([verificationMethodToRemove.id], existingDocument.authentication),
    capabilityInvocation:
      existingDocument.capabilityInvocation &&
      without(
        [verificationMethodToRemove.id],
        existingDocument.capabilityInvocation
      ),
    capabilityDelegation:
      existingDocument.capabilityDelegation &&
      without(
        [verificationMethodToRemove.id],
        existingDocument.capabilityDelegation
      ),
    keyAgreement:
      existingDocument.keyAgreement &&
      without([verificationMethodToRemove.id], existingDocument.keyAgreement),
    verificationMethod:
      existingDocument.verificationMethod &&
      without(
        [verificationMethodToRemove],
        existingDocument.verificationMethod
      ),
  };

  // filter default keys from capability invocation and verification method
  // if they are the only ones, as they are added by the client by default, and do not need
  // to be stored on chain
  if (
    document.verificationMethod?.length === 1 &&
    isDefault(document.verificationMethod[0])
  ) {
    delete document.verificationMethod;
  }
  if (
    document.capabilityInvocation?.length === 1 &&
    isDefault(document.capabilityInvocation[0])
  ) {
    delete document.capabilityInvocation;
  }

  sanitizeDefaultKeys(document);

  return registerOrUpdate(
    did,
    document,
    connection,
    payer,
    authority,
    'Overwrite'
  );
};
