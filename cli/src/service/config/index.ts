import * as os from "os";
import * as path from "path";
import * as yaml from "yaml";
import * as fs from "fs";
import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import { ExtendedCluster } from "@identity.com/cryptid";

const DEFAULT_CONFIG_FILE = path.join(
  os.homedir(),
  ".config",
  "cryptid",
  "config.yml"
);
const DEFAULT_ID_FILE = path.join(os.homedir(), ".config", "solana", "id.json");

const DEFAULT_CLUSTER: ExtendedCluster = "devnet";

type ConfigFile = {
  did: string;
  keyFile: string;
  cluster: ExtendedCluster;
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
    this.connection = new Connection(clusterUrl);
  }

  static init(
    overwrite: boolean,
    configPath: string = DEFAULT_CONFIG_FILE,
    keyPath: string = DEFAULT_ID_FILE,
    cluster: ExtendedCluster = DEFAULT_CLUSTER
  ): Config {
    const keypair = loadKeyFile(keyPath);

    const configObject: ConfigFile = {
      did: "did:sol:" + keypair.publicKey.toBase58(),
      keyFile: keyPath,
      cluster,
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
    const configObject: ConfigFile = {
      ...this.config,
      [key]: value,
    };

    fs.writeFileSync(this.configPath, yaml.stringify(configObject));
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
