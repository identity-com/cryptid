import {Cryptid, CryptidOptions} from "./Cryptid";
import {Signer} from "../types/crypto";
import {Keypair} from "@solana/web3.js";
import {normalizeSigner} from "../lib/util";
import {SimpleCryptid} from "./SimpleCryptid";

export class Builder {
  static async build(did: string, signer: Keypair | Signer, options: CryptidOptions):Promise<Cryptid> {
    return new SimpleCryptid(did, normalizeSigner(signer), options)
  }
}
