import { PublicKey } from "@solana/web3.js";
import { Flags } from "@oclif/core";

export const config = Flags.string({
  char: "c",
  description: "Path to config file",
  default: process.env.CRYPTID_CONFIG,
});

export const key = Flags.build<PublicKey>({
  char: "k",
  description: "Key (base58)",
  parse: async (address: string) => new PublicKey(address),
})();

export const alias = Flags.string({ char: "a", description: "Key alias" });

export const as = Flags.string({
  char: "s",
  description: "Execute transactions as a controlled identity (alias or did)",
});

export const common = {
  help: Flags.help({ char: "h" }),
  config,
  as,
};
