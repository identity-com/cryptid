import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { create } from '../instructions/directExecute';
import { Signer } from '../../../types/crypto';
import {createTransaction, didIsRegistered} from "./util";
import {DecentralizedIdentifier} from "@identity.com/sol-did-client";

/**
 * Creates a Direct_Execute transaction, that signs and sends a transaction from a DID
 */
export const directExecute = async (
  connection: Connection,
  unsignedTransaction: Transaction,
  did: string,
  payer: PublicKey,
  signers: Signer[],
  doa?: PublicKey
): Promise<Transaction> => {
  // TODO @brett https://civicteam.slack.com/archives/C01361EBHU1/p1632382952242200
  const isRegistered = await didIsRegistered(connection, did);
  const parsedDID = DecentralizedIdentifier.parse(did)
  const didKey = isRegistered ? await parsedDID.pdaSolanaPubkey() : parsedDID.authorityPubkey.toPublicKey()

  const directExecuteInstruction = await create(
    unsignedTransaction,
    didKey,
    signers,
    doa
  );

  return createTransaction(
    connection,
    [directExecuteInstruction],
    payer,
    signers
  );
};
