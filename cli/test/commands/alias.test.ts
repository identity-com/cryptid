import { expect, test } from "@oclif/test";

describe("alias", () => {
  test
    .stdout()
    .command(["alias", "Alice", "did:sol:alice"])
    .it("adds the alias to config", (ctx) => {
      expect(ctx.stdout).to.contain("Added");
    });
});
