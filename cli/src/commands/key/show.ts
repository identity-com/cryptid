import { Command } from "@oclif/command";
import { Config } from "../../service/config";
import { build, getKeys } from "../../service/cryptid";
import * as Flags from "../../lib/flags";

export default class ShowKeys extends Command {
  static description = "List keys attached to the cryptid account";

  static flags = Flags.common;

  static args = [];

  static aliases = [""];

  async run(): Promise<void> {
    const { flags } = this.parse(ShowKeys);

    const config = new Config(flags.config);
    const cryptid = build(config);

    const keys = await getKeys(cryptid);
    this.log(keys.join("\n"));
  }
}
