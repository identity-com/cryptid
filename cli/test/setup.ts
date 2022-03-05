import * as path from "path";

process.env.TS_NODE_PROJECT = path.resolve("test/tsconfig.json");
process.env.NODE_ENV = "development";

process.env.CRYPTID_CONFIG = path.join(__dirname, "fixtures", "config.yml");
