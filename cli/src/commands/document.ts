import Base from "./base";

export default class Document extends Base {
  static description = "Show the cryptid account's DID Document";

  static flags = Base.flags;

  async run(): Promise<void> {
    const document = await this.cryptid.document();

    this.log(JSON.stringify(document, null, 1));
  }
}
