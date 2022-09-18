import {Cryptid, CryptidOptions, FindAllOptions} from './cryptid';
import { Wallet } from '../types/crypto';
import { Keypair } from '@solana/web3.js';
import { SimpleCryptid } from './simpleCryptid';
import { normalizeSigner } from "../lib/crypto";
import {CryptidAccountDetails} from "../lib/CryptidAccountDetails";
import {Middleware} from "../lib/Middleware";
import {CryptidService} from "../service/cryptid";

export class Builder {
  static async buildFromDID(
      did: string,
      signer: Keypair | Wallet,
      options: CryptidOptions
  ): Promise<Cryptid> {
    const details = await CryptidAccountDetails.defaultAccount(did);
    return new SimpleCryptid(details, normalizeSigner(signer), options);
  }

  static build(details: CryptidAccountDetails, signer: Keypair | Wallet, options: CryptidOptions): Cryptid {
    return new SimpleCryptid(details, normalizeSigner(signer), options);
  }

  static async create(details: CryptidAccountDetails, signer: Keypair | Wallet, middleware: Middleware[], options: CryptidOptions): Promise<Cryptid> {
    const service = new CryptidService(normalizeSigner(signer), options.connection, options.confirmOptions);
    await service.createAccount(details);
    return Builder.build(details, signer, options);
  }

  static async findAll(did: string, options: FindAllOptions): Promise<CryptidAccountDetails[]> {
    const service = CryptidService.permissionless(options.connection, {})
    let offset = 0;
    const page = 20;
    const found = [];
    let nextPage = []
    do {
      const nextPage = await service.findAllAccounts(did, offset, page);
      found.push(...nextPage);
      offset += page;
    } while (nextPage.length < page);

    return found;
  }
}
