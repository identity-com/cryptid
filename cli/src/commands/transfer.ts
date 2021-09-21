import { Command, flags } from "@oclif/command";
import { Config } from "../service/config";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { build } from "../service/cryptid";

export default class Transfer extends Command {
  static description = "describe the command here";

  static flags = {
    help: flags.help({ char: "h" }),
    config: flags.string({ char: "c", description: "Path to config file" }),
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
  };

  static args = [];

  async run(): Promise<void> {
    const { flags } = this.parse(Transfer);

    const config = new Config(flags.config);
    const cryptid = await build(config);

    const { blockhash: recentBlockhash } =
      await config.connection.getRecentBlockhash();
    const tx = new Transaction({
      recentBlockhash,
      feePayer: config.keypair.publicKey,
    });
    tx.add(
      SystemProgram.transfer({
        fromPubkey: config.keypair.publicKey,
        toPubkey: flags.to as PublicKey,
        lamports: flags.amount,
      })
    );

    const [signedTx] = await cryptid.sign(tx);
    const txSignature = await config.connection.sendRawTransaction(
      signedTx.serialize()
    );

    this.log(
      `Transaction sent: https://explorer.identity.com/tx/${txSignature}`
    );
  }
}
