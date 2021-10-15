import { PublicKey } from "@solana/web3.js";
import { flags } from "@oclif/command";

export const config = flags.string({
  char: "c",
  description: "Path to config file",
  default: process.env.CRYPTID_CONFIG,
});

export const key = flags.build<PublicKey>({
  char: "k",
  description: "Key (base58)",
  parse: (address: string) => new PublicKey(address),
})();

export const alias = flags.string({ char: "a", description: "Key alias" });

export const as = flags.string({
  char: "s",
  description: "Execute transactions as a controlled identity (alias or did)",
});

export const common = {
  help: flags.help({ char: "h" }),
  config,
  as,
};
