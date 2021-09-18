import * as os from "os";
import * as path from "path";
import * as yaml from "yaml";
import * as fs from "fs";
import { Keypair } from "@solana/web3.js";

const DEFAULT_CONFIG_FILE = path.join(
  os.homedir(),
  ".config",
  "cryptid",
  "config.yml"
);
const DEFAULT_ID_FILE = path.join(os.homedir(), ".config", "solana", "id.json");

type ConfigFile = {
  did: string;
  keyFile: string;
};

const loadKeyFile = (keyFile: string): Keypair => {
  const keyFileJson = JSON.parse(fs.readFileSync(keyFile, "utf-8"));
  return Keypair.fromSecretKey(Buffer.from(keyFileJson, "utf-8"));
};

export class Config {
  config: ConfigFile;

  constructor(configPath: string = DEFAULT_CONFIG_FILE) {
    if (!fs.existsSync(configPath))
      throw new Error(`No config at ${configPath}`);

    const configFileString = fs.readFileSync(configPath, { encoding: "utf-8" });
    this.config = yaml.parse(configFileString);
  }

  static init(
    overwrite: boolean,
    configPath: string = DEFAULT_CONFIG_FILE,
    keyPath: string = DEFAULT_ID_FILE
  ): Config {
    const keypair = loadKeyFile(keyPath);

    const configObject: ConfigFile = {
      did: "did:sol:" + keypair.publicKey.toBase58(),
      keyFile: keyPath,
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
