import { airdrop } from "../service/cryptid";
import Base from "./base";

const DEFAULT_AIRDROP_LAMPORTS = 1_000_000_000;

export default class Airdrop extends Base {
  static description = "Airdrop funds into the cryptid account and owner key";

  static args = [
    {
      name: "amount",
      default: DEFAULT_AIRDROP_LAMPORTS,
      parse: async (amountStr: string): Promise<number> =>
        parseInt(amountStr, 10),
    },
  ];

  static flags = Base.flags;

  async run(): Promise<void> {
    const { args } = await this.parse(Airdrop);

    await airdrop(this.cryptid, this.cryptidConfig, args.amount, this.log);
  }
}
