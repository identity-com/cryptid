import { Command } from "@oclif/command";
import { Config } from "../../service/config";
import { build, getControllers } from "../../service/cryptid";
import * as Flags from "../../lib/flags";

export default class RemoveController extends Command {
  static description = "Add a controller to a cryptid account";

  static flags = Flags.common;

  static args = [{ name: "did" }];

  async run(): Promise<void> {
    const { flags } = this.parse(RemoveController);

    const config = new Config(flags.config);
    const cryptid = build(config);

    const controllers = await getControllers(cryptid);
    this.log(controllers.join("\n"));
  }
}
