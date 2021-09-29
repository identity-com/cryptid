import { Command } from "@oclif/command";
import { Config } from "../service/config";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { build, resolveRecipient } from "../service/cryptid";
import * as Flags from "../lib/flags";

export default class Transfer extends Command {
  static description = "Send SOL to a recipient";

  static flags = Flags.common;

  static args = [
    {
      name: "to",
      description: "Recipient alias, did or public key (base58)",
      required: true,
    },
    {
      name: "amount",
      description: "The amount in lamports to transfer",
      required: true,
    },
  ];

  async run(): Promise<void> {
    const { args, flags } = this.parse(Transfer);

    const config = new Config(flags.config);
    const cryptid = build(config);
    const address = await cryptid.address();

    const to = await resolveRecipient(args.to, config);

    this.log(`${args.to} resolved to ${to}`);

    const { blockhash: recentBlockhash } =
      await config.connection.getRecentBlockhash();

    const tx = new Transaction({
      recentBlockhash,
      feePayer: config.keypair.publicKey,
    }).add(
      SystemProgram.transfer({
        fromPubkey: address,
        toPubkey: to as PublicKey,
        lamports: args.amount,
      })
    );

    const [signedTx] = await cryptid.sign(tx);
    console.log(
      signedTx.signatures.map((s) => ({
        publicKey: s.publicKey.toString(),
        signature: s.signature,
      }))
    );
    console.log(
      signedTx.instructions[0].keys.map((k) => ({
        ...k,
        pubkey: k.pubkey.toString(),
      }))
    );
    const txSignature = await config.connection.sendRawTransaction(
      signedTx.serialize()
    );

    this.log(
      `Transaction sent: https://explorer.identity.com/tx/${txSignature}`
    );
  }
}
