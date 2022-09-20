import { balance } from "../service/cryptid";
import Base from "./base";

export default class Balance extends Base {
  static description = "Show the cryptid account SOL balance";

  static args = [];

  static flags = Base.flags;

  async run(): Promise<void> {
    const address = await this.cryptid.address();
    const cryptidBalance = await balance(this.cryptid, this.cryptidConfig);
    this.log(`${address}: ${cryptidBalance} lamports`);
  }
}
