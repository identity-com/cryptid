import {
  CRYPTID_PROGRAM,
  ExecuteMiddlewareParams,
  GenericMiddlewareParams,
  MiddlewareClient,
  MiddlewareResult,
} from "@identity.com/cryptid-core";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { AnchorProvider, Program } from "@project-serum/anchor";
import {
  SuperuserCheckSigner,
  SuperuserCheckSignerIDL,
} from "@identity.com/cryptid-idl";
import * as anchor from "@project-serum/anchor";

export const SUPERUSER_CHECK_SIGNER_MIDDLEWARE_PROGRAM_ID = new PublicKey(
  "midsEy2qfSX1gguxZT3Kv4dGTDisi7iDMAJfSmyG5Y9"
);

export const deriveMiddlewareAccountAddress = (
  authority: PublicKey,
  signer: PublicKey,
  previousMiddlewareAccount?: PublicKey
): [PublicKey, number] =>
  PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("superuser_check_signer"),
      authority.toBuffer(),
      signer.toBuffer(),
      previousMiddlewareAccount?.toBuffer() || Buffer.alloc(32),
    ],
    SUPERUSER_CHECK_SIGNER_MIDDLEWARE_PROGRAM_ID
  );

export type SuperuserCheckSignerParameters = {
  signer: PublicKey;
} & GenericMiddlewareParams;
export class SuperuserCheckSignerMiddleware
  implements MiddlewareClient<SuperuserCheckSignerParameters>
{
  private static getProgram(
    params: GenericMiddlewareParams
  ): Program<SuperuserCheckSigner> {
    // TODO probably move some of this to a common middleware utils lib
    const anchorProvider = new AnchorProvider(
      params.connection,
      params.authority,
      params.opts
    );

    return new Program<SuperuserCheckSigner>(
      SuperuserCheckSignerIDL,
      SUPERUSER_CHECK_SIGNER_MIDDLEWARE_PROGRAM_ID,
      anchorProvider
    );
  }

  public async createMiddleware(
    params: SuperuserCheckSignerParameters
  ): Promise<Transaction> {
    const program = SuperuserCheckSignerMiddleware.getProgram(params);

    const [middlewareAccount, middlewareBump] = deriveMiddlewareAccountAddress(
      params.authority.publicKey,
      params.signer,
      params.previousMiddleware
    );

    return program.methods
      .create(params.signer, middlewareBump, params.previousMiddleware || null)
      .accounts({
        middlewareAccount,
        authority: params.authority.publicKey,
      })
      .transaction();
  }

  private async createExecuteInstruction(
    program: Program<SuperuserCheckSigner>,
    params: ExecuteMiddlewareParams
  ): Promise<TransactionInstruction> {
    return program.methods
      .executeMiddleware()
      .accounts({
        middlewareAccount: params.middlewareAccount,
        transactionAccount: params.transactionAccount,
        cryptidAccount: params.cryptidAccountDetails.address,
        cryptidProgram: CRYPTID_PROGRAM,
      })
      .instruction();
  }

  private async middlewareHasPreviousMiddleware(
    program: Program<SuperuserCheckSigner>,
    middlewareAccountAddress: PublicKey
  ): Promise<boolean> {
    const middlewareAccount = await program.account.superuserCheckSigner.fetch(
      middlewareAccountAddress
    );
    return middlewareAccount.previousMiddleware !== null;
  }

  // Nothing to do on propose - only on execute
  public async onPropose(): Promise<MiddlewareResult> {
    return { instructions: [], signers: [] };
  }

  public async onExecute(
    params: ExecuteMiddlewareParams
  ): Promise<MiddlewareResult> {
    const program = SuperuserCheckSignerMiddleware.getProgram(params);

    const executeInstruction = await this.createExecuteInstruction(
      program,
      params
    );

    return { instructions: [executeInstruction], signers: [] };
  }

  public async onClose(): Promise<MiddlewareResult> {
    return { instructions: [], signers: [] };
  }
}
