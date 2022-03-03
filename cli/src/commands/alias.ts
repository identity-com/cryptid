import { flags } from "@oclif/command";
import * as Flags from "../lib/flags";
import { mapObjIndexed } from "ramda";
import Base from "./base";

export default class Alias extends Base {
  static description = "Associate a DID with an alias";

  static flags = {
    ...Flags.common,
    unset: flags.boolean({
      char: "u",
      description: "unset an alias",
      default: false,
    }),
  };

  static args = [{ name: "name" }, { name: "did" }];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Alias);

    if (!flags.unset && args.name && args.did) {
      this.cryptidConfig.alias(args.name, args.did);
    } else if (flags.unset && args.name) {
      this.cryptidConfig.removeAlias(args.name);
    } else if (!flags.unset && !args.name && !args.did) {
      const aliases = this.cryptidConfig.config.aliases || {};
      mapObjIndexed((val, key: string) => {
        this.log(`${key}: ${val}`);
      }, aliases);
    }
  }
}
