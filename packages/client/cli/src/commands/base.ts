import { Command, Config as OclifConfig } from "@oclif/core";
import * as Flags from "../lib/flags";
import { Config } from "../service/config";
import { build, resolveDIDOrAlias } from "../service/cryptid";
import { Connection } from "@solana/web3.js";
import { CryptidClient } from "@identity.com/cryptid-hh";

export default abstract class Base extends Command {
  private _cryptid: CryptidClient | undefined;

  private _config: Config | undefined;

  static flags = Flags.common;

  constructor(argv: string[], oclifConfig: OclifConfig) {
    super(argv, oclifConfig);
  }

  get cryptid(): CryptidClient {
    if (!this._cryptid)
      throw new Error("Cannot retrieve cryptid before init()");
    return this._cryptid;
  }

  get cryptidConfig(): Config {
    if (!this._config) throw new Error("Cannot retrieve config before init()");
    return this._config;
  }

  get connection(): Connection {
    return this.cryptidConfig.connection;
  }

  async init(): Promise<void> {
    // workaround for using static flags and args in base oclif command classes
    // note, each subclass must define its own args and flags to avoid inconsistencies
    // https://github.com/oclif/oclif/issues/225#issuecomment-806318444
    const { flags } = await this.parse(this.ctor as typeof Base);

    this._config = new Config(flags.config);
    this._cryptid = await build(
      this._config,
      resolveDIDOrAlias(flags.as, this._config)
    );
  }
}
