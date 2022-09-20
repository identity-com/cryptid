import { getKeys } from "../../service/cryptid";
import Base from "../base";

export default class RemoveKey extends Base {
  static description = "Remove a cryptid key";

  static args = [{ name: "alias" }];

  static flags = Base.flags;

  async run(): Promise<void> {
    const { args } = await this.parse(RemoveKey);

    this.log("TODO!!!" + args);
    // await this.cryptid.removeKey(args.alias)
    this.log("Removed");

    const keys = await getKeys(this.cryptid);
    this.log(keys.join("\n"));
  }
}
