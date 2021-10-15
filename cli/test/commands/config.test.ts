import { expect, test } from "@oclif/test";

describe("config", () => {
  test
    .stdout()
    .command([
      "config",
      "show",
      "--config",
      `${__dirname}/../fixtures/config.yml`,
    ])
    .it("runs show", (ctx) => {
      expect(ctx.stdout).to.contain(
        "did: did:sol:FtMiL5EHC9ap56ZKcLYZRtyAnKVJoEqhf5JysiZXgTEm"
      );
    });
});
