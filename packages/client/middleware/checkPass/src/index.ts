import {
  CRYPTID_PROGRAM,
  ExecuteMiddlewareParams,
  GenericMiddlewareParams,
  MiddlewareClient,
} from "@identity.com/cryptid-core";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { AnchorProvider, Program } from "@project-serum/anchor";
import { CheckPass, CheckPassIDL } from "@identity.com/cryptid-idl";
import * as anchor from "@project-serum/anchor";
import {
  getFeatureAccountAddress,
  getGatewayTokenAddressForOwnerAndGatekeeperNetwork,
  NetworkFeature,
  UserTokenExpiry,
} from "@identity.com/solana-gateway-ts";

export const CHECK_PASS_MIDDLEWARE_PROGRAM_ID = new PublicKey(
  "midpT1DeQGnKUjmGbEtUMyugXL5oEBeXU3myBMntkKo"
);
const GATEWAY_PROGRAM = new PublicKey(
  "gatem74V238djXdzWnJf94Wo1DcnuGkfijbf3AuBhfs"
);

// The gateway protocol uses Borsh directly (rather than anchor)
// and network features is not yet fully integrated into the gateway SDKs
// so we have to build this value (for referring to a gatekeeper network feature)
// manually.
// Borsh imposes this odd structure for Enums
const expireFeature = new NetworkFeature({
  userTokenExpiry: new UserTokenExpiry({}),
});

const deriveMiddlewareAccountAddress = (
  authority: PublicKey,
  gatekeeperNetwork: PublicKey
): [PublicKey, number] =>
  PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("check_pass"),
      authority.toBuffer(),
      gatekeeperNetwork.toBuffer(),
    ],
    CHECK_PASS_MIDDLEWARE_PROGRAM_ID
  );

const getExpireFeatureAddress = (
  gatekeeperNetwork: PublicKey
): Promise<PublicKey> =>
  getFeatureAccountAddress(expireFeature, gatekeeperNetwork);

export type CheckPassParameters = {
  gatekeeperNetwork: PublicKey;
  keyAlias: string;
  expirePassOnUse: boolean;
  failsafe?: PublicKey;
} & GenericMiddlewareParams;
export class CheckPassMiddleware
  implements MiddlewareClient<CheckPassParameters>
{
  private static getProgram(
    params: GenericMiddlewareParams
  ): Program<CheckPass> {
    // TODO probably move some of this to a common middleware utils lib
    const anchorProvider = new AnchorProvider(
      params.connection,
      params.authority,
      params.opts
    );

    return new Program<CheckPass>(
      CheckPassIDL,
      CHECK_PASS_MIDDLEWARE_PROGRAM_ID,
      anchorProvider
    );
  }

  public async createMiddleware(
    params: CheckPassParameters
  ): Promise<Transaction> {
    const program = CheckPassMiddleware.getProgram(params);

    const [middlewareAccount, middlewareBump] = deriveMiddlewareAccountAddress(
      params.authority.publicKey,
      params.gatekeeperNetwork
    );

    return program.methods
      .create(
        params.gatekeeperNetwork,
        middlewareBump,
        params.expirePassOnUse,
        params.failsafe || null
      )
      .accounts({
        middlewareAccount,
        authority: params.authority.publicKey,
      })
      .transaction();
  }

  public async executeMiddleware(
    params: ExecuteMiddlewareParams
  ): Promise<TransactionInstruction> {
    const program = CheckPassMiddleware.getProgram(params);

    const middlewareAccount = await program.account.checkPass.fetch(
      params.middlewareAccount
    );
    const expireFeatureAccount = await getExpireFeatureAddress(
      middlewareAccount.gatekeeperNetwork
    );
    const gatewayToken =
      await getGatewayTokenAddressForOwnerAndGatekeeperNetwork(
        params.authority.publicKey,
        middlewareAccount.gatekeeperNetwork
      );

    return program.methods
      .executeMiddleware()
      .accounts({
        middlewareAccount: params.middlewareAccount,
        transactionAccount: params.transactionAccount,
        owner: params.cryptidAccountDetails.didAccount,
        authority: params.authority.publicKey,
        expireFeatureAccount,
        gatewayToken,
        cryptidProgram: CRYPTID_PROGRAM,
        gatewayProgram: GATEWAY_PROGRAM,
      })
      .instruction();
  }
}
