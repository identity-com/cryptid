import {
  CRYPTID_PROGRAM,
  ExecuteMiddlewareParams,
  GenericMiddlewareParams,
  MiddlewareClient,
  MiddlewareResult,
} from "@identity.com/cryptid-core";
import { PublicKey, Transaction } from "@solana/web3.js";
import { AnchorProvider, Program } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import { CheckDid, CheckDidIDL } from "@identity.com/cryptid-idl";

export const CHECK_DID_MIDDLEWARE_PROGRAM_ID = new PublicKey(
  "midb3GKX7wF1minPXeDKqGRKCK9NeR8ns9V8BQUMJDr"
);

export type VerificationMethodMatcher = {
  filterFragment: string | null;
  filterFlags: number | null;
  filterTypes: Buffer | null;
  filterKeyData: Buffer | null;
};

export type ServiceMatcher = {
  filterFragment: string | null;
  filterServiceType: string | null;
  filterServiceEndpoint: string | null;
};

export type ControllerMatcher = {
  filterNativeController: PublicKey | null;
  filterOtherController: string | null;
};

export type CheckDidParameters = {
  verificationMethodMatcher: VerificationMethodMatcher;
  serviceMatcher: ServiceMatcher;
  controllerMatcher: ControllerMatcher;
} & GenericMiddlewareParams;

export const deriveMiddlewareAccountAddress = (
  params: CheckDidParameters
): [PublicKey, number] => {
  const seeds = [
    anchor.utils.bytes.utf8.encode("check_did"),
    params.authority.publicKey.toBuffer(),
    params.previousMiddleware?.toBuffer() || Buffer.alloc(32),
  ];

  return PublicKey.findProgramAddressSync(
    seeds,
    CHECK_DID_MIDDLEWARE_PROGRAM_ID
  );
};

export class CheckDidMiddleware
  implements MiddlewareClient<CheckDidParameters>
{
  private static getProgram(
    params: GenericMiddlewareParams
  ): Program<CheckDid> {
    // TODO probably move some of this to a common middleware utils lib
    const anchorProvider = new AnchorProvider(
      params.connection,
      params.authority,
      params.opts
    );

    return new Program<CheckDid>(
      CheckDidIDL,
      CHECK_DID_MIDDLEWARE_PROGRAM_ID,
      anchorProvider
    );
  }

  public async createMiddleware(
    params: CheckDidParameters
  ): Promise<Transaction> {
    const program = CheckDidMiddleware.getProgram(params);

    const [middlewareAccount] = deriveMiddlewareAccountAddress(params);

    return program.methods
      .create(
        params.verificationMethodMatcher,
        params.serviceMatcher,
        params.controllerMatcher,
        params.previousMiddleware || null
      )
      .accounts({
        middlewareAccount,
        authority: params.authority.publicKey,
      })
      .transaction();
  }

  public async onPropose(): Promise<MiddlewareResult> {
    return { instructions: [], signers: [] };
  }

  public async onExecute(
    params: ExecuteMiddlewareParams
  ): Promise<MiddlewareResult> {
    const program = CheckDidMiddleware.getProgram(params);

    const instructions = await program.methods
      .executeMiddleware()
      .accounts({
        middlewareAccount: params.middlewareAccount,
        transactionAccount: params.transactionAccount,
        did: params.cryptidAccountDetails.didAccount,
        authority: params.authority.publicKey,
        cryptidProgram: CRYPTID_PROGRAM,
      })
      .instruction()
      .then(Array.of);

    return { instructions, signers: [] };
  }

  public async onClose(): Promise<MiddlewareResult> {
    return { instructions: [], signers: [] };
  }
}
