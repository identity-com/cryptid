import { getKeys } from "../../service/cryptid";
import { PublicKey } from "@solana/web3.js";
import Base from "../base";

export default class AddKey extends Base {
  static description = "Add a cryptid key";

  static args = [
    {
      name: "key",
      required: false,
      parse: async (address: string): Promise<PublicKey> =>
        new PublicKey(address),
    },
    { name: "alias" },
  ];

  static flags = Base.flags;

  async run(): Promise<void> {
    const { args } = await this.parse(AddKey);

    await this.cryptid.addKey(args.key, args.alias);
    this.log("Added");

    const keys = await getKeys(this.cryptid);
    this.log(keys.join("\n"));
  }
}
