import { getKeys } from "../../service/cryptid";
import Base from "../base";

export default class ShowKeys extends Base {
  static description = "List keys attached to the cryptid account";

  static args = [];

  static flags = Base.flags;

  static aliases = [""];

  async run(): Promise<void> {
    const keys = await getKeys(this.cryptid);
    this.log(keys.join("\n"));
  }
}
