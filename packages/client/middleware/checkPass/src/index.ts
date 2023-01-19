import {
  CRYPTID_PROGRAM,
  ExecuteMiddlewareParams,
  GenericMiddlewareParams,
  MiddlewareClient,
  MiddlewareResult,
} from "@identity.com/cryptid-core";
import { PublicKey, Transaction } from "@solana/web3.js";
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

export const deriveMiddlewareAccountAddress = (
  authority: PublicKey,
  gatekeeperNetwork: PublicKey,
  failsafe?: PublicKey,
  previousMiddlewareAccount?: PublicKey
): [PublicKey, number] => {
  const seeds = [
    anchor.utils.bytes.utf8.encode("check_pass"),
    authority.toBuffer(),
    gatekeeperNetwork.toBuffer(),
    failsafe?.toBuffer() || Buffer.alloc(32),
    previousMiddlewareAccount?.toBuffer() || Buffer.alloc(32),
  ];
  return PublicKey.findProgramAddressSync(
    seeds,
    CHECK_PASS_MIDDLEWARE_PROGRAM_ID
  );
};

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

    const [middlewareAccount] = deriveMiddlewareAccountAddress(
      params.authority.publicKey,
      params.gatekeeperNetwork,
      params.failsafe,
      params.previousMiddleware
    );

    return program.methods
      .create(
        params.gatekeeperNetwork,
        params.expirePassOnUse,
        params.failsafe || null,
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

    const instructions = await program.methods
      .executeMiddleware()
      .accounts({
        middlewareAccount: params.middlewareAccount,
        transactionAccount: params.transactionAccount,
        did: params.cryptidAccountDetails.didAccount,
        authority: params.authority.publicKey,
        expireFeatureAccount,
        gatewayToken,
        cryptidProgram: CRYPTID_PROGRAM,
        gatewayProgram: GATEWAY_PROGRAM,
      })
      .instruction()
      .then(Array.of);

    return { instructions, signers: [] };
  }

  public async onClose(): Promise<MiddlewareResult> {
    return { instructions: [], signers: [] };
  }
}
