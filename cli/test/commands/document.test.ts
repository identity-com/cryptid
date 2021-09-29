import { expect, test } from "@oclif/test";

describe("document", () => {
  test
    .stdout()
    .command(["document"])
    .it("shows the document", (ctx) => {
      expect(ctx.stdout).to.contain(
        '"id": "did:sol:FtMiL5EHC9ap56ZKcLYZRtyAnKVJoEqhf5JysiZXgTEm"'
      );
    });
});
