import { Command } from "@oclif/command";
import * as Flags from "../lib/flags";
import { Config } from "../service/config";
import { build } from "../service/cryptid";

export default class Document extends Command {
  static description = "Show the cryptid account's DID Document";

  static flags = Flags.common;

  static args = [];

  async run(): Promise<void> {
    const { flags } = this.parse(Document);

    const config = new Config(flags.config);
    const cryptid = build(config);
    const document = await cryptid.document();

    this.log(JSON.stringify(document, null, 1));
  }
}
