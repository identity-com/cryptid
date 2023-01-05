import { getKeys } from "../../service/cryptid";
import Base from "../base";
import { removeKeyFromDID } from "../../service/did";

export default class RemoveKey extends Base {
  static description = "Remove a cryptid key";

  static args = [{ name: "alias" }];

  static flags = Base.flags;

  async run(): Promise<void> {
    const { args } = await this.parse(RemoveKey);

    await removeKeyFromDID(
      this.cryptid.wallet,
      args.alias,
      this.cryptidConfig.config.cluster,
      this.cryptidConfig.connection
    );
    this.log(`Removed ${args.alias}`);

    const keys = await getKeys(this.cryptid);
    this.log("Remaining keys:");
    this.log(keys.join("\n"));
  }
}
