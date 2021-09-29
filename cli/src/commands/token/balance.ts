import { Command } from "@oclif/command";
import * as Flags from "../../lib/flags";
import { Config } from "../../service/config";
import { build, getTokenAccounts, TokenDetails } from "../../service/cryptid";
import { PublicKey } from "@solana/web3.js";

export default class TokenBalance extends Command {
  static description = "show an SPL Token balance";

  static flags = Flags.common;

  static args = [
    {
      name: "mint",
      description: "The SPL-Token mint(base58)",
      required: true,
      parse: (address: string): PublicKey => new PublicKey(address),
    },
  ];

  async run(): Promise<void> {
    const { args, flags } = this.parse(TokenBalance);

    const config = new Config(flags.config);
    const cryptid = build(config);

    const accounts = await getTokenAccounts(cryptid, config);

    const token = accounts.find(
      (token: TokenDetails) => token.mint.toString() === args.mint.toString()
    );

    this.log(token ? token.balance : "0");
  }
}
