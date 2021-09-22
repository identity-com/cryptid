import { Command, flags } from "@oclif/command";
import { Config } from "../service/config";
import { build } from "../service/cryptid";
import { PublicKey } from "@solana/web3.js";
import { Cryptid } from "@identity.com/cryptid";
import { VerificationMethod } from "did-resolver";

enum Subcommand {
  SHOW = "show",
  ADD = "add",
  REMOVE = "remove",
}

const subcommands = Object.entries(Subcommand).map(([, v]) => v);

export default class Key extends Command {
  static description = "Manage cryptid keys";

  static flags = {
    help: flags.help({ char: "h" }),
    config: flags.string({
      char: "c",
      description: "Path to config file",
      default: process.env.CRYPTID_CONFIG,
    }),
    key: flags.build<PublicKey>({
      char: "k",
      description: "Key (base58)",
      parse: (address: string) => new PublicKey(address),
    })(),
    alias: flags.string({ char: "a", description: "Key alias" }),
  };

  static args = [
    {
      name: "subcommand",
      options: subcommands,
      required: true,
      default: "show",
    },
    {
      name: "key",
      required: false,
      parse: (address: string): PublicKey => new PublicKey(address),
    },
    { name: "alias" },
  ];

  private async show(cryptid: Cryptid) {
    const doc = await cryptid.document();
    const keys = (doc.verificationMethod || [])
      .map((verificationMethod: VerificationMethod) => ({
        alias: verificationMethod.id.substring(
          verificationMethod.id.indexOf("#") + 1
        ),
        key: verificationMethod.publicKeyBase58,
      }))
      .map(
        ({ alias, key }: { alias: string; key: string | undefined }) =>
          `${alias}: ${key}`
      );

    this.log(keys.join("\n"));
  }

  async run(): Promise<void> {
    const { args, flags } = this.parse(Key);

    const config = new Config(flags.config);
    const cryptid = await build(config);

    switch (args.subcommand) {
      case Subcommand.SHOW:
        await this.show(cryptid);
        break;
      case Subcommand.ADD:
        await cryptid.addKey(args.key, args.alias);
        this.log("Added");
        await this.show(cryptid);
        break;
    }
  }
}
