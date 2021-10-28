import { Command } from "@oclif/command";
import * as Flags from "../lib/flags";
import { Config } from "../service/config";
import { build, resolveDIDOrAlias } from "../service/cryptid";
import { Cryptid } from "@identity.com/cryptid";
import { Connection } from "@solana/web3.js";

export default abstract class Base extends Command {
  private _cryptid: Cryptid | undefined;

  private _config: Config | undefined;

  static flags = Flags.common;

  get cryptid(): Cryptid {
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
    const { flags } = this.parse(this.ctor as typeof Base);

    this._config = new Config(flags.config);
    this._cryptid = build(
      this._config,
      resolveDIDOrAlias(flags.as, this._config)
    );
  }
}
