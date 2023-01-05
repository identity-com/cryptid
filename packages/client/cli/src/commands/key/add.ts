import { getKeys } from "../../service/cryptid";
import { PublicKey } from "@solana/web3.js";
import Base from "../base";
import { addKeyToDID } from "../../service/did";

export default class AddKey extends Base {
  static description = "Add a cryptid key";

  static args = [
    {
      name: "key",
      required: true,
      parse: async (address: string): Promise<PublicKey> =>
        new PublicKey(address),
    },
    { name: "alias", required: true },
  ];

  static flags = Base.flags;

  async run(): Promise<void> {
    const { args } = await this.parse(AddKey);

    await addKeyToDID(
      this.cryptid.wallet,
      args.key,
      args.alias,
      this.cryptidConfig.config.cluster,
      this.cryptidConfig.connection
    );
    this.log("Added");

    const keys = await getKeys(this.cryptid);
    this.log(keys.join("\n"));
  }
}
