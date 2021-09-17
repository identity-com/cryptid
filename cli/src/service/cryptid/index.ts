import {Cryptid, build as buildCryptid} from "@identity.com/cryptid";
import {Config} from "../config";
import {Connection} from "@solana/web3.js";

export const build = (config: Config, connection: Connection):Promise<Cryptid> => {
  return buildCryptid(config.did, config.keypair, { connection });
}
