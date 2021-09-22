import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { create } from '../instructions/directExecute';
import { Signer } from '../../../types/crypto';
import {createAndSignTransaction} from "./util";

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
  const directExecuteInstruction = await create(
    unsignedTransaction,
    did,
    signers,
    doa
  );

  return createAndSignTransaction(
    connection,
    [directExecuteInstruction],
    payer,
    signers
  );
};
