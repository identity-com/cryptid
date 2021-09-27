import { Command } from "@oclif/command";
import { Config } from "../service/config";
import { balance, build } from "../service/cryptid";
import * as Flags from "../lib/flags";

export default class Balance extends Command {
  static description = "Show the cryptid account SOL balance";

  static flags = Flags.common;

  static args = [{ name: "file" }];

  async run(): Promise<void> {
    const { flags } = this.parse(Balance);

    const config = new Config(flags.config);
    const cryptid = build(config);

    const address = await cryptid.address();
    const cryptidBalance = await balance(cryptid, config);
    this.log(`${address}: ${cryptidBalance} lamports`);
  }
}
