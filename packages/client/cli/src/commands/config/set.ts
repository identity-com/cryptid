import Base from "../base";

export default class ConfigSet extends Base {
  static description = "Set a Cryptid configuration value";

  static args = [{ name: "key" }, { name: "value" }];

  static flags = Base.flags;

  async run(): Promise<void> {
    const { args } = await this.parse(ConfigSet);

    this.cryptidConfig.set(args.key, args.value);
    this.log(this.cryptidConfig.show());
  }
}
