import { Command } from "@oclif/command";
import * as Flags from "../lib/flags";

export default class Control extends Command {
  static description = "control another cryptid account";

  static flags = Flags.common;

  static args = [{ name: "DID to control" }];

  async run(): Promise<void> {
    const { args } = this.parse(Control);

    this.log("TODO " + args);
  }
}
