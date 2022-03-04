import { expect, test } from "@oclif/test";
import * as fs from "fs";

// not recoognising the correct config path
describe("init", () => {
  const configPath = "./tmp.yaml";
  test
    .stdout()
    .command([
      "init",
      "-p",
      configPath,
      "-k",
      `${__dirname}/../fixtures/id.json`,
    ])
    .finally(() => {
      if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
    })
    .it("runs init", (ctx) => {
      expect(ctx.stdout).to.contain("Creating config");
    });
});
