import {
  CRYPTID_PROGRAM,
  ExecuteMiddlewareParams,
  GenericMiddlewareParams,
  MiddlewareClient,
  MiddlewareResult,
} from "@identity.com/cryptid-core-hh";
import { PublicKey, Transaction } from "@solana/web3.js";
import BN from "bn.js";
import { AnchorProvider, Program } from "@project-serum/anchor";
import { TimeDelay, TimeDelayIDL } from "@identity.com/cryptid-idl";
import * as anchor from "@project-serum/anchor";

export const TIME_DELAY_MIDDLEWARE_PROGRAM_ID = new PublicKey(
  "midttN2h6G2CBvt1kpnwUsFXM6Gv7gratVwuo2XhSNk"
);

export const deriveMiddlewareAccountAddress = (
  authority: PublicKey,
  seconds: number,
  previousMiddlewareAccount?: PublicKey
): [PublicKey, number] =>
  PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("time_delay"),
      authority.toBuffer(),
      new BN(seconds).toArrayLike(Buffer, "le", 8),
      previousMiddlewareAccount?.toBuffer() || Buffer.alloc(32),
    ],
    TIME_DELAY_MIDDLEWARE_PROGRAM_ID
  );

export const deriveTransactionStateMiddlewareAccountAddress = (
  transaction_account: PublicKey
): [PublicKey, number] =>
  PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("time_delay_creation_time"),
      transaction_account.toBuffer(),
    ],
    TIME_DELAY_MIDDLEWARE_PROGRAM_ID
  );

export type TimeDelayParameters = {
  seconds: number;
} & GenericMiddlewareParams;
export class TimeDelayMiddleware
  implements MiddlewareClient<TimeDelayParameters>
{
  private static getProgram(
    params: GenericMiddlewareParams
  ): Program<TimeDelay> {
    // TODO probably move some of this to a common middleware utils lib
    const anchorProvider = new AnchorProvider(
      params.connection,
      params.authority,
      params.opts
    );

    return new Program<TimeDelay>(
      TimeDelayIDL,
      TIME_DELAY_MIDDLEWARE_PROGRAM_ID,
      anchorProvider
    );
  }

  public async createMiddleware(
    params: TimeDelayParameters
  ): Promise<Transaction> {
    const program = TimeDelayMiddleware.getProgram(params);

    const [middlewareAccount, middlewareBump] = deriveMiddlewareAccountAddress(
      params.authority.publicKey,
      params.seconds,
      params.previousMiddleware
    );

    return program.methods
      .create(
        new BN(params.seconds),
        middlewareBump,
        params.previousMiddleware || null
      )
      .accounts({
        middlewareAccount,
        authority: params.authority.publicKey,
      })
      .transaction();
  }

  public async onPropose(
    params: ExecuteMiddlewareParams
  ): Promise<MiddlewareResult> {
    const program = TimeDelayMiddleware.getProgram(params);

    const [transactionStateAddress] =
      deriveTransactionStateMiddlewareAccountAddress(params.transactionAccount);

    const registerInstruction = await program.methods
      .registerTransaction()
      .accounts({
        middlewareAccount: params.middlewareAccount,
        transactionAccount: params.transactionAccount,
        transactionCreateTime: transactionStateAddress,
        authority: params.authority.publicKey,
      })
      .instruction();

    return { instructions: [registerInstruction], signers: [] };
  }

  public async onExecute(
    params: ExecuteMiddlewareParams
  ): Promise<MiddlewareResult> {
    const program = TimeDelayMiddleware.getProgram(params);

    const [transactionStateAddress, transactionStateBump] =
      deriveTransactionStateMiddlewareAccountAddress(params.transactionAccount);

    const instructions = await program.methods
      .executeMiddleware(transactionStateBump)
      .accounts({
        middlewareAccount: params.middlewareAccount,
        transactionAccount: params.transactionAccount,
        transactionCreateTime: transactionStateAddress,
        destination: params.authority.publicKey,
        cryptidProgram: CRYPTID_PROGRAM,
      })
      .instruction()
      .then(Array.of);

    return { instructions, signers: [] };
  }
}
