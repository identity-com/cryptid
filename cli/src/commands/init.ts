import { Command, flags } from "@oclif/command";
import { Config as ConfigService } from "../service/config";
import { ExtendedCluster } from "@identity.com/cryptid";

export default class Init extends Command {
  static description = "Initialise the cryptid library";

  static flags = {
    help: flags.help({ char: "h" }),
    overwrite: flags.boolean({
      char: "o",
      description: "Overwrite existing configuration",
      default: false,
    }),
    path: flags.string({
      char: "p",
      description: "Configuration path",
      required: false,
      default: process.env.CRYPTID_CONFIG,
    }),
    key: flags.string({
      char: "k",
      description: "Path to a solana keypair",
      required: false,
    }),
    cluster: flags.string({
      char: "z",
      description: "Cluster",
      required: false,
    }),
  };

  static args = [{ name: "file" }];

  async run(): Promise<void> {
    const { flags } = this.parse(Init);

    ConfigService.init(
      flags.overwrite,
      flags.path,
      flags.key,
      flags.cluster as ExtendedCluster | undefined
    );
  }
}
