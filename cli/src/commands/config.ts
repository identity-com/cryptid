import { Command, flags } from "@oclif/command";
import { Config as ConfigService } from "../service/config";

export default class Config extends Command {
  static description = "describe the command here";

  static flags = {
    help: flags.help({ char: "h" }),
    config: flags.string({ char: "c", description: "Path to config file" }),
  };

  static args = [
    { name: "subcommand", options: ["show", "set"], default: "show" },
  ];

  async run(): Promise<void> {
    const { args, flags } = this.parse(Config);

    const service = new ConfigService(flags.config);

    switch (args.subcommand) {
      case "show":
        this.log(service.show());
    }
  }
}
