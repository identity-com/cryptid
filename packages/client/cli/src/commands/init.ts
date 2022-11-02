import { Command, Flags } from "@oclif/core";
import { Config as ConfigService } from "../service/config";
import { ExtendedCluster } from "@identity.com/cryptid-hh";

export default class Init extends Command {
  static description = "Initialise the cryptid library";

  static flags = {
    help: Flags.help({ char: "h" }),
    overwrite: Flags.boolean({
      char: "o",
      description: "Overwrite existing configuration",
      default: false,
    }),
    path: Flags.string({
      char: "c",
      description: "Configuration path",
      required: false,
      default: process.env.CRYPTID_CONFIG,
    }),
    key: Flags.string({
      char: "k",
      description: "Path to a solana keypair",
      required: false,
    }),
    cluster: Flags.string({
      char: "z",
      description: "Cluster",
      required: false,
    }),
  };

  static args = [];

  async run(): Promise<void> {
    const { flags } = await this.parse(Init);

    ConfigService.init(
      flags.overwrite,
      flags.path,
      flags.key,
      flags.cluster as ExtendedCluster | undefined
    );
  }
}
