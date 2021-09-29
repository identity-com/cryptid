import { Command } from "@oclif/command";
import { Config } from "../../service/config";
import { build, getKeys } from "../../service/cryptid";
import { PublicKey } from "@solana/web3.js";
import * as Flags from "../../lib/flags";

export default class AddKey extends Command {
  static description = "Add a cryptid key";

  static flags = Flags.common;

  static args = [
    {
      name: "key",
      required: false,
      parse: (address: string): PublicKey => new PublicKey(address),
    },
    { name: "alias" },
  ];

  async run(): Promise<void> {
    const { args, flags } = this.parse(AddKey);

    const config = new Config(flags.config);
    const cryptid = build(config);

    await cryptid.addKey(args.key, args.alias);
    this.log("Added");

    const keys = await getKeys(cryptid);
    this.log(keys.join("\n"));
  }
}
