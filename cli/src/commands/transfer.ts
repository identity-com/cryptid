import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { resolveRecipient } from "../service/cryptid";
import Base from "./base";

export default class Transfer extends Base {
  static description = "Send SOL to a recipient";

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

  static flags = Base.flags;

  async run(): Promise<void> {
    const { args } = this.parse(Transfer);

    const address = await this.cryptid.address();

    const to = await resolveRecipient(args.to, this.cryptidConfig);

    this.log(`${args.to} resolved to ${to}`);

    const { blockhash: recentBlockhash } =
      await this.connection.getRecentBlockhash();

    const tx = new Transaction({
      recentBlockhash,
      feePayer: this.cryptidConfig.keypair.publicKey,
    }).add(
      SystemProgram.transfer({
        fromPubkey: address,
        toPubkey: to as PublicKey,
        lamports: args.amount,
      })
    );

    const [signedTx] = await this.cryptid.sign(tx);
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
    const txSignature = await this.connection.sendRawTransaction(
      signedTx.serialize()
    );

    this.log(
      `Transaction sent: https://explorer.identity.com/tx/${txSignature}`
    );
  }
}
