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
import { CheckRecipient, CheckRecipientIDL } from "@identity.com/cryptid-idl";
import * as anchor from "@project-serum/anchor";

export const CHECK_RECIPIENT_MIDDLEWARE_PROGRAM_ID = new PublicKey(
  "midcHDoZsxvMmNtUr8howe8MWFrJeHHPbAyJF1nHvyf"
);

export const deriveMiddlewareAccountAddress = (
  authority: PublicKey,
  recipient: PublicKey,
  previousMiddlewareAccount?: PublicKey
): [PublicKey, number] =>
  PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("check_recipient"),
      authority.toBuffer(),
      recipient.toBuffer(),
      previousMiddlewareAccount?.toBuffer() || Buffer.alloc(32),
    ],
    CHECK_RECIPIENT_MIDDLEWARE_PROGRAM_ID
  );

export type CheckRecipientParameters = {
  recipient: PublicKey;
} & GenericMiddlewareParams;
export class CheckRecipientMiddleware
  implements MiddlewareClient<CheckRecipientParameters>
{
  private static getProgram(
    params: GenericMiddlewareParams
  ): Program<CheckRecipient> {
    // TODO probably move some of this to a common middleware utils lib
    const anchorProvider = new AnchorProvider(
      params.connection,
      params.authority,
      params.opts
    );

    return new Program<CheckRecipient>(
      CheckRecipientIDL,
      CHECK_RECIPIENT_MIDDLEWARE_PROGRAM_ID,
      anchorProvider
    );
  }

  public async createMiddleware(
    params: CheckRecipientParameters
  ): Promise<Transaction> {
    const program = CheckRecipientMiddleware.getProgram(params);

    const [middlewareAccount, middlewareBump] = deriveMiddlewareAccountAddress(
      params.authority.publicKey,
      params.recipient,
      params.previousMiddleware
    );

    return program.methods
      .create(
        params.recipient,
        middlewareBump,
        params.previousMiddleware || null
      )
      .accounts({
        middlewareAccount,
        authority: params.authority.publicKey,
      })
      .transaction();
  }

  private async createExecuteInstruction(
    program: Program<CheckRecipient>,
    params: ExecuteMiddlewareParams
  ): Promise<TransactionInstruction> {
    return program.methods
      .executeMiddleware()
      .accounts({
        middlewareAccount: params.middlewareAccount,
        transactionAccount: params.transactionAccount,
        cryptidProgram: CRYPTID_PROGRAM,
      })
      .instruction();
  }

  private async middlewareHasPreviousMiddleware(
    program: Program<CheckRecipient>,
    middlewareAccountAddress: PublicKey
  ): Promise<boolean> {
    const middlewareAccount = await program.account.checkRecipient.fetch(
      middlewareAccountAddress
    );
    return middlewareAccount.previousMiddleware !== null;
  }

  public async onPropose(
    params: ExecuteMiddlewareParams
  ): Promise<MiddlewareResult> {
    const program = CheckRecipientMiddleware.getProgram(params);

    if (
      await this.middlewareHasPreviousMiddleware(
        program,
        params.middlewareAccount
      )
    ) {
      return { instructions: [], signers: [] };
    }

    // If there is no previous middleware
    // then this middleware can be executed on propose,
    // as it does not rely on anything other than the transaction data itself
    // TODO handle expanding a transaction before proposal
    const executeInstruction = await this.createExecuteInstruction(
      program,
      params
    );

    return { instructions: [executeInstruction], signers: [] };
  }

  public async onExecute(
    params: ExecuteMiddlewareParams
  ): Promise<MiddlewareResult> {
    const program = CheckRecipientMiddleware.getProgram(params);

    if (
      await this.middlewareHasPreviousMiddleware(
        program,
        params.middlewareAccount
      )
    ) {
      // If there is no previous middleware
      // then this middleware can be executed on propose,
      // as it does not rely on anything other than the transaction data itself
      // TODO handle expanding a transaction before proposal
      const executeInstruction = await this.createExecuteInstruction(
        program,
        params
      );

      return { instructions: [executeInstruction], signers: [] };
    }

    return { instructions: [], signers: [] };
  }

  public async onClose(): Promise<MiddlewareResult> {
    return { instructions: [], signers: [] };
  }
}
