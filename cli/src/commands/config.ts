import { Command, flags } from "@oclif/command";
import { Config as ConfigService } from "../service/config";
import { build } from "../service/cryptid";

enum Subcommand {
  SHOW = "show",
  SET = "set",
}

const subcommands = Object.entries(Subcommand).map(([, v]) => v);

export default class Config extends Command {
  static description = "Manage Cryptid configuration";

  static flags = {
    help: flags.help({ char: "h" }),
    config: flags.string({
      char: "c",
      description: "Path to config file",
      default: process.env.CRYPTID_CONFIG,
    }),
  };

  static args = [
    { name: "subcommand", options: subcommands, default: "show" },
    { name: "key" },
    { name: "value" },
  ];

  async run(): Promise<void> {
    const { args, flags } = this.parse(Config);

    const service = new ConfigService(flags.config);
    const cryptid = await build(service);

    const address = await cryptid.address();

    switch (args.subcommand) {
      case Subcommand.SHOW:
        this.log(service.configPath);
        this.log(`Address: ${address}`);
        this.log(service.show());
        break;
      case Subcommand.SET:
        service.set(args.key, args.value);
        this.log(service.show());
        break;
    }
  }
}
