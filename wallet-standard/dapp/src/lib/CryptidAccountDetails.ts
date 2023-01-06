import { PublicKey, AccountInfo } from "@solana/web3.js";
import { didToPDA } from "./did";
import { getCryptidAccountAddress } from "./cryptid";
import { Middleware } from "./Middleware";
import { CryptidAccount } from "../types";

export class CryptidAccountDetails {
  constructor(
    // The address of the cryptid account PDA on chain
    readonly address: PublicKey,
    // The bump seed used to derive the cryptid account PDA
    readonly bump: number,
    // The index of the DID's cryptid account
    readonly index: number,
    // The DID of the cryptid account
    readonly ownerDID: string,
    // The on-chain PDA of the DID (may be generative)
    readonly didAccount: PublicKey,
    // The correct bump for the given didAccount
    readonly didAccountBump: number,
    // Middlewares attached to the account
    readonly middlewares: Middleware[]
  ) {}

  static defaultAccount(did: string): CryptidAccountDetails {
    return CryptidAccountDetails.from(did);
  }

  static from(
    did: string,
    index = 0,
    middlewares: Middleware[] = []
  ): CryptidAccountDetails {
    const didAccount = didToPDA(did);
    const [address, bump] = getCryptidAccountAddress(didAccount[0], index);
    return new CryptidAccountDetails(
      address,
      bump,
      index,
      did,
      didAccount[0],
      didAccount[1],
      middlewares
    );
  }

  static fromAccounts<M>(
    did: string,
    address: PublicKey,
    cryptidAccount: CryptidAccount,
    middlewareAccounts: [PublicKey, AccountInfo<M>][]
  ): CryptidAccountDetails {
    const didAccount = didToPDA(did);
    // TODO optimise? this is literally just to recalculate the bump
    // NOTE: the bump is needed when making transactions.
    // It is not stored on the cryptid account, as that does not work with the generative case.
    const [, bump] = getCryptidAccountAddress(
      didAccount[0],
      cryptidAccount.index
    );
    return new CryptidAccountDetails(
      address,
      bump,
      cryptidAccount.index,
      did,
      didAccount[0],
      didAccount[1],
      middlewareAccounts.map(
        ([key, accountInfo]) => new Middleware(accountInfo.owner, key)
      )
    );
  }
}
