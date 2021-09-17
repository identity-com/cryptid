import { expect, test } from "@oclif/test";
import * as fs from "fs";

describe("init", () => {
  const configPath = "./tmp.yaml";
  test
    .stdout()
    .command([
      "init",
      "--path",
      configPath,
      "--key",
      `${__dirname}/../fixtures/id.json`,
    ])
    .finally(() => {
      if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
    })
    .it("runs init", (ctx) => {
      expect(ctx.stdout).to.contain("Creating config");
    });
});
