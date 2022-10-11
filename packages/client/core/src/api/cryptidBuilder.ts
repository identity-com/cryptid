import {
  BuildOptions,
  CryptidClient,
  CryptidOptions,
  FindAllOptions,
} from "./cryptidClient";
import { Wallet } from "../types/crypto";
import { Keypair } from "@solana/web3.js";
import { SimpleCryptidClient } from "./simpleCryptidClient";
import { normalizeSigner } from "../lib/crypto";
import { CryptidAccountDetails } from "../lib/CryptidAccountDetails";
import { Middleware } from "../lib/Middleware";
import { CryptidService } from "../service/cryptid";
import { didToPDA } from "../lib/did";
import { getCryptidAccountAddress } from "../lib/cryptid";

export class CryptidBuilder {
  static build(
    details: CryptidAccountDetails,
    signer: Keypair | Wallet,
    options: CryptidOptions
  ): CryptidClient {
    return new SimpleCryptidClient(details, normalizeSigner(signer), options);
  }

  static buildFromDID(
    did: string,
    signer: Keypair | Wallet,
    options: BuildOptions
  ): CryptidClient {
    const details = CryptidAccountDetails.from(
      did,
      options.accountIndex,
      options.middlewares
    );

    return CryptidBuilder.build(details, signer, options);
  }

  static async create(
    details: CryptidAccountDetails,
    signer: Keypair | Wallet,
    options: CryptidOptions
  ): Promise<CryptidClient> {
    const service = new CryptidService(
      normalizeSigner(signer),
      options.connection,
      options.confirmOptions
    );
    await service.createAccount(details);
    return CryptidBuilder.build(details, signer, options);
  }

  static createFromDID(
    did: string,
    signer: Keypair | Wallet,
    middleware: Middleware[],
    options: CryptidOptions
  ): Promise<CryptidClient> {
    const index = options.accountIndex === undefined ? 1 : options.accountIndex; // 0 is reserved for the default (generative) cryptid
    const didAccount = didToPDA(did);
    const [address, bump] = getCryptidAccountAddress(didAccount[0], index);
    const details = new CryptidAccountDetails(
      address,
      bump,
      index,
      did,
      didAccount[0],
      didAccount[1],
      middleware
    );
    return CryptidBuilder.create(details, signer, options);
  }

  static async findAll(
    did: string,
    options: FindAllOptions
  ): Promise<CryptidAccountDetails[]> {
    const service = CryptidService.permissionless(options.connection, {});
    let offset = 0;
    const page = 20;
    const found = [];
    const nextPage = [];
    do {
      const nextPage = await service.findAllAccounts(did, offset, page);
      found.push(...nextPage);
      offset += page;
    } while (nextPage.length === page);

    return found;
  }
}
