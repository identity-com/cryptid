import { Command, flags } from "@oclif/command";
import * as Flags from "../lib/flags";
import { Config as ConfigService } from "../service/config";
import { mapObjIndexed } from "ramda";

export default class Alias extends Command {
  static description = "describe the command here";

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
    const { args, flags } = this.parse(Alias);

    const service = new ConfigService(flags.config);

    if (!flags.unset && args.name && args.did) {
      service.alias(args.name, args.did);
    } else if (flags.unset && args.name) {
      service.removeAlias(args.name);
    } else if (!flags.unset && !args.name && !args.did) {
      const aliases = service.config.aliases || {};
      mapObjIndexed((val, key: string) => {
        this.log(`${key}: ${val}`);
      }, aliases);
    }
  }
}
