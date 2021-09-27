import {
  AccountMeta,
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { create } from '../instructions/directExecute';
import { Signer } from '../../../types/crypto';
import { createTransaction } from './util';
import { DecentralizedIdentifier } from '@identity.com/sol-did-client';

/**
 * Creates a Direct_Execute transaction, that signs and sends a transaction from a DID
 */
export const directExecute = async (
  connection: Connection,
  unsignedTransaction: Transaction,
  did: string,
  payer: PublicKey,
  signers: ([Signer, (PublicKey | AccountMeta)[]] | Signer)[],
  doa?: PublicKey
): Promise<Transaction> => {
  const signersNormalized: [Signer, (PublicKey | AccountMeta)[]][] =
    signers.map((signer) => {
      if (signer instanceof Array) {
        return signer;
      } else {
        return [signer, []];
      }
    });

  const parsedDID = DecentralizedIdentifier.parse(did);
  const didPDAKey = await parsedDID.pdaSolanaPubkey();

  const directExecuteInstruction = await create(
    unsignedTransaction,
    didPDAKey,
    signersNormalized,
    doa
  );

  return createTransaction(
    connection,
    [directExecuteInstruction],
    payer,
    signersNormalized.map(([signer]) => signer)
  );
};
