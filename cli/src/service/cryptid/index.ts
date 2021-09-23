import { Cryptid, build as buildCryptid } from "@identity.com/cryptid";
import { Config } from "../config";

export const build = (config: Config): Cryptid =>
  buildCryptid(config.did, config.keypair, {
    connection: config.connection,
  });

export const balance = async (
  cryptid: Cryptid,
  config: Config
): Promise<number> => {
  const address = await cryptid.address();
  return config.connection.getBalance(address);
};

export const airdrop = async (
  cryptid: Cryptid,
  config: Config,
  amount: number
): Promise<void> => {
  const key = config.keypair.publicKey;
  const doaSigner = await cryptid.address();

  await Promise.all([
    config.connection.requestAirdrop(key, amount),
    config.connection.requestAirdrop(doaSigner, amount),
  ]);
};
