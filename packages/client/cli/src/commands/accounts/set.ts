import Base from "../base";

export default class AccountsSet extends Base {
  static description = "Set a Cryptid configuration value";

  static args = [{ name: "index", required: true }];

  static flags = Base.flags;

  async run(): Promise<void> {
    const { args } = await this.parse(AccountsSet);

    this.cryptidConfig.set("index", Number(args.index));
    this.log(this.cryptidConfig.show());
  }
}
