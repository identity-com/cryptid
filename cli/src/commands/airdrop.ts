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
  };

  static args = [
    {
      name: "amount",
      default: DEFAULT_AIRDROP_LAMPORTS,
      parse: (amountStr: string): number => parseInt(amountStr, 10),
    },
  ];

  async run(): Promise<void> {
    const { flags, args } = this.parse(Airdrop);

    const config = new Config(flags.config);
    const cryptid = build(config);

    await airdrop(cryptid, config, args.amount);
  }
}
