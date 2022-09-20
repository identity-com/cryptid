import * as os from "node:os";
import * as path from "node:path";
import * as yaml from "yaml";
import * as fs from "node:fs";
import {
  clusterApiUrl,
  Commitment,
  Connection,
  Keypair,
} from "@solana/web3.js";
import { ExtendedCluster } from "packages/client/core/src";
import { omit } from "ramda";

const DEFAULT_CONFIG_FILE = path.join(
  os.homedir(),
  ".config",
  "cryptid",
  "config.yml"
);
const DEFAULT_ID_FILE = path.join(os.homedir(), ".config", "solana", "id.json");

const DEFAULT_CLUSTER: ExtendedCluster = "devnet";
const DEFAULT_COMMITMENT: Commitment = "confirmed";

type ConfigFile = {
  did: string;
  keyFile: string;
  cluster: ExtendedCluster;
  aliases: { [key: string]: string }; // Record<string, string>
};

const loadKeyFile = (keyFile: string): Keypair => {
  const keyFileJson = JSON.parse(fs.readFileSync(keyFile, "utf-8"));
  return Keypair.fromSecretKey(Buffer.from(keyFileJson, "utf-8"));
};

export class Config {
  config: ConfigFile;

  readonly connection: Connection;

  constructor(readonly configPath: string = DEFAULT_CONFIG_FILE) {
    if (!fs.existsSync(configPath))
      throw new Error(`No config at ${configPath}. Have you run cryptid init?`);

    const configFileString = fs.readFileSync(configPath, { encoding: "utf-8" });
    this.config = yaml.parse(configFileString);

    const clusterUrl =
      this.config.cluster === "localnet"
        ? "http://localhost:8899"
        : clusterApiUrl(this.config.cluster);
    this.connection = new Connection(clusterUrl, DEFAULT_COMMITMENT);
  }

  static init(
    overwrite: boolean,
    configPath: string = DEFAULT_CONFIG_FILE,
    keyPath: string = DEFAULT_ID_FILE,
    cluster: ExtendedCluster = DEFAULT_CLUSTER
  ): Config {
    const keypair = loadKeyFile(keyPath);

    const configObject: ConfigFile = {
      did: `did:sol:${cluster}:${keypair.publicKey.toBase58()}`,
      keyFile: keyPath,
      cluster,
      aliases: {},
    };

    if (fs.existsSync(configPath)) {
      if (!overwrite)
        throw new Error(`Config file at ${configPath} already exists.`);
    } else {
      console.log(`Creating config at path ${path.dirname(configPath)}`);
      if (!fs.existsSync(path.dirname(configPath)))
        fs.mkdirSync(path.dirname(configPath));
    }

    fs.writeFileSync(configPath, yaml.stringify(configObject));

    return new Config(configPath);
  }

  set<K extends keyof ConfigFile>(key: K, value: ConfigFile[K]): void {
    if (key === "aliases")
      throw new Error("Cannot set field " + key + " with this command");

    const configObject: ConfigFile = {
      ...this.config,
      [key]: value,
    };

    fs.writeFileSync(this.configPath, yaml.stringify(configObject));

    this.config = configObject;
  }

  alias(name: string, did: string): void {
    const configObject: ConfigFile = {
      ...this.config,
      aliases: {
        ...this.config.aliases,
        [name]: did,
      },
    };

    fs.writeFileSync(this.configPath, yaml.stringify(configObject));
  }

  removeAlias(name: string): void {
    const configObject: ConfigFile = {
      ...this.config,
      aliases: omit([name], this.config.aliases || {}),
    };

    fs.writeFileSync(this.configPath, yaml.stringify(configObject));

    this.config = configObject;
  }

  show(): string {
    return yaml.stringify(this.config);
  }

  get did(): string {
    return this.config.did;
  }

  get keypair(): Keypair {
    return loadKeyFile(this.config.keyFile);
  }
}
