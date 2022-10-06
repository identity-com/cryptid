import Base from "../base";

export default class ConfigShow extends Base {
  static description = "Show Cryptid configuration";

  static args = [];

  static flags = Base.flags;

  static aliases = ["show"];

  async run(): Promise<void> {
    const address = await this.cryptid.address();

    this.log(this.cryptidConfig.configPath);
    this.log(`Address: ${address}`);
    this.log(this.cryptidConfig.show());
  }
}
