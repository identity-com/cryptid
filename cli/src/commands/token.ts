import { Command, flags } from "@oclif/command";
import { PublicKey } from "@solana/web3.js";

export default class Token extends Command {
  static description = "describe the command here";

  static flags = {
    help: flags.help({ char: "h" }),
    to: flags.build<PublicKey>({
      char: "t",
      description: "Recipient public key (base58)",
      required: true,
      parse: (address: string) => new PublicKey(address),
    })(),
    amount: flags.integer({
      char: "a",
      description: "The amount in lamports to transfer",
      required: true,
    }),
    mint: flags.build<PublicKey>({
      char: "m",
      description: "The SPL-Token mint(base58)",
      required: true,
      parse: (address: string) => new PublicKey(address),
    })(),
  };

  static args = [{ name: "subcommand", options: ["transfer"] }];

  async run(): Promise<void> {
    const { args, flags } = this.parse(Token);

    this.log("TODO", { args, flags });
  }
}
