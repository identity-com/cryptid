import { Cryptid, build as buildCryptid } from "@identity.com/cryptid";
import { Config } from "../config";

export const build = (config: Config): Promise<Cryptid> => {
  return buildCryptid(config.did, config.keypair, {
    connection: config.connection,
  });
};
