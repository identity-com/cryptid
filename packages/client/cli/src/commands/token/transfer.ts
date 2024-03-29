import { Flags } from "@oclif/core";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import * as flags from "../../lib/flags";
import Base from "../base";
import {
  resolveRecipient,
  signAndSendCryptidTransaction,
} from "../../service/cryptid";

export const getAssociatedTokenAccount = async (
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> => getAssociatedTokenAddress(mint, owner, true);

export default class TokenTransfer extends Base {
  static description = "Send SPL-Tokens to a recipient";

  static flags = {
    ...flags.common,
    mint: Flags.custom<PublicKey>({
      char: "m",
      description: "The SPL-Token mint(base58)",
      required: true,
      parse: async (address: string): Promise<PublicKey> =>
        new PublicKey(address),
    })(),
    allowUnfundedRecipient: Flags.boolean({
      char: "f",
      description: "Create a token account for the recipient if needed",
      default: false,
    }),
  };

  static args = [
    {
      name: "to",
      description: "Recipient alias, did or public key (base58)",
      required: true,
    },
    {
      name: "amount",
      description: "The amount of tokens to transfer",
      required: true,
    },
  ];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(TokenTransfer);

    const cryptidAddress = await this.cryptid.address();

    const to = await resolveRecipient(args.to, this.cryptidConfig);
    this.log(`${args.to} resolved to ${to}`);

    // oclif type system does not make required flags non-null
    this.log("mint: " + flags.mint!.toBase58()); // eslint-disable-line @typescript-eslint/no-non-null-assertion

    const { blockhash: recentBlockhash } =
      await this.cryptidConfig.connection.getRecentBlockhash();

    const senderAssociatedTokenAccount = await getAssociatedTokenAccount(
      flags.mint as PublicKey,
      cryptidAddress
    );
    const recipientAssociatedTokenAccount = await getAssociatedTokenAccount(
      flags.mint as PublicKey,
      to
    );

    console.log("this.cryptid ATA " + senderAssociatedTokenAccount);

    const instructions = [];

    if (flags.allowUnfundedRecipient) {
      // check if the recipient ATA exists:
      const recipientATAAccount = await this.connection.getAccountInfo(
        recipientAssociatedTokenAccount
      );

      if (!recipientATAAccount) {
        this.log("Creating a token account for " + to);
        const createATAInstruction = createAssociatedTokenAccountInstruction(
          flags.mint as PublicKey,
          recipientAssociatedTokenAccount,
          to,
          cryptidAddress
        );

        instructions.push(createATAInstruction);
      }
    }

    const transferInstruction = createTransferInstruction(
      senderAssociatedTokenAccount,
      recipientAssociatedTokenAccount,
      cryptidAddress,
      args.amount
    );
    instructions.push(transferInstruction);

    const tx = new Transaction({
      recentBlockhash,
      feePayer: cryptidAddress,
    }).add(...instructions);

    const txSignatures = await signAndSendCryptidTransaction(this.cryptid, tx);

    txSignatures.forEach((signature) => {
      this.log(
        `Transaction sent: https://explorer.identity.com/tx/${signature}`
      );
    });
  }
}
