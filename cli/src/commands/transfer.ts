import { resolveRecipient, transfer } from "../service/cryptid";
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

    const to = await resolveRecipient(args.to, this.cryptidConfig);

    this.log(`${args.to} resolved to ${to}`);

    const txSignature = await transfer(
      this.cryptid,
      this.cryptidConfig,
      to,
      args.amount
    );

    this.log(
      `Transaction sent: https://explorer.identity.com/tx/${txSignature}`
    );
  }
}
