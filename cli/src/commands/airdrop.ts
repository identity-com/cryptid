import { Command, flags } from "@oclif/command";
import { Config } from "../service/config";
import { airdrop, build } from "../service/cryptid";

const DEFAULT_AIRDROP_LAMPORTS = 100_000;

export default class Airdrop extends Command {
  static description = "Airdrop funds into the cryptid account and owner key";

  static flags = {
    help: flags.help({ char: "h" }),
    config: flags.string({
      char: "c",
      description: "Path to config file",
      default: process.env.CRYPTID_CONFIG,
    }),
    amount: flags.integer({
      char: "a",
      description: "The amount in lamports to airdrop",
      default: DEFAULT_AIRDROP_LAMPORTS,
    }),
  };

  static args = [{ name: "file" }];

  async run(): Promise<void> {
    const { flags } = this.parse(Airdrop);

    const config = new Config(flags.config);
    const cryptid = await build(config);

    await airdrop(cryptid, config, flags.amount);
  }
}
