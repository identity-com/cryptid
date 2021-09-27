import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Signer } from '../../../../types/crypto';
import {registerOrUpdate} from "./util";
import {DIDDocument, ServiceEndpoint} from "did-resolver";

/**
 * Creates a transaction that adds a service to a DID.
 *
 * This transaction will either contain a register instruction (if the DID is not yet registered on chain)
 * or an update instruction (if it is already registered), but not both
 */
export const addService = async (
  connection: Connection,
  did: string,
  payer: PublicKey,
  service: ServiceEndpoint,
  signers: Signer[]
): Promise<Transaction> => {
  const document: Partial<DIDDocument> = {
    service: [service]
  };

  return registerOrUpdate(did, document, connection, payer, signers);
};
