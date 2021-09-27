import { Command } from "@oclif/command";
import { Config } from "../../service/config";
import { build } from "../../service/cryptid";
import * as Flags from "../../lib/flags";

export default class RemoveController extends Command {
  static description = "Add a controller to a cryptid account";

  static flags = Flags.common;

  static args = [{ name: "did" }];

  async run(): Promise<void> {
    const { args, flags } = this.parse(RemoveController);

    const config = new Config(flags.config);
    const cryptid = build(config);

    await cryptid.removeController(args.did);
    this.log("Removed");
  }
}
