import { Command } from "@oclif/command";
import { Config } from "../service/config";
import { airdrop, build } from "../service/cryptid";
import * as Flags from "../lib/flags";

const DEFAULT_AIRDROP_LAMPORTS = 50_000_000;

export default class Airdrop extends Command {
  static description = "Airdrop funds into the cryptid account and owner key";

  static flags = Flags.common;

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
