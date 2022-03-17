import { AccountMeta, PublicKey, Transaction } from "@solana/web3.js";
import { Signer } from "../../../types/crypto";
import { NonEmptyArray } from "../../../types/lang";
import { normalizeSigner } from "./util";
import { DecentralizedIdentifier } from "@identity.com/sol-did-client";
import { create } from "../instructions/proposeTransaction";

/**
 * Optional extra keys for a signer
 */
export type SignerExtra = PublicKey | AccountMeta;
/**
 * A signer passed to `directExecute`
 */
export type SignerArg = Signer | [Signer, SignerExtra[]];

/**
 * Creates a Direct_Execute transaction, that signs and sends a transaction from a DID
 */
export const largeExecute = async (
  unsignedTransaction: Transaction,
  did: string,
  payer: PublicKey,
  signers: SignerArg[],
  cryptidAccount?: PublicKey,
  debug = false
): Promise<{
  setupTransactions: NonEmptyArray<Transaction>;
  executeTransaction: Transaction;
}> => {
  const signersNormalized = normalizeSigner(signers);
  const parsedDID = DecentralizedIdentifier.parse(did);
  const didPDAKey = await parsedDID.pdaSolanaPubkey();


  // Large TX execution.
  // export const create = async (
  //   unsignedTransaction: Transaction,
  //   didPDAKey: PublicKey,
  //   signers: [Signer, AccountMeta[]][],
  //   doa?: PublicKey,
  //   debug = false
  // )

  // what seed.

  const instruction = await create(
    accounts,
    instructions,
    didPDAKey,
    'cryptid',
    cryptidAccount,
    seed,
    [[normalizeSigner(payer), []]],
    readyToExecute
  );

  // Create one propose and x expand transactions on the large input transaction.
  for (const inst of unsignedTransaction.instructions) {
    // every instruction has
    inst.data;
    inst.keys[0].; // multiable
    inst.programId
  }



  return {
    setupTransactions: [unsignedTransaction],
    executeTransaction: unsignedTransaction
  }

}