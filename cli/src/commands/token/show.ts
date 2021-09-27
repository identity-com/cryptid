import { Command } from "@oclif/command";
import * as Flags from "../../lib/flags";
import { Config } from "../../service/config";
import { build, getTokenAccounts, TokenDetails } from "../../service/cryptid";

const prettyPrint = (token: TokenDetails): string =>
  `${token.mint}:\t${token.balance}`;

export default class TokenShow extends Command {
  static description = "show all SPL Token balances";

  static flags = Flags.common;

  static args = [];

  async run(): Promise<void> {
    const { flags } = this.parse(TokenShow);

    const config = new Config(flags.config);
    const cryptid = build(config);

    const accounts = await getTokenAccounts(cryptid, config);

    this.log(accounts.map(prettyPrint).join("\n"));
  }
}
