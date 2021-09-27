import { Command } from "@oclif/command";
import { Config } from "../../service/config";
import { build, getKeys } from "../../service/cryptid";
import * as Flags from "../../lib/flags";

export default class RemoveKey extends Command {
  static description = "Remove a cryptid key";

  static flags = Flags.common;

  static args = [{ name: "alias" }];

  async run(): Promise<void> {
    const { args, flags } = this.parse(RemoveKey);

    const config = new Config(flags.config);
    const cryptid = build(config);

    await cryptid.removeKey(args.alias);
    this.log("Removed");

    const keys = await getKeys(cryptid);
    this.log(keys.join("\n"));
  }
}
