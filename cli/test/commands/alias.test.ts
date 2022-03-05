import { expect, test } from "@oclif/test";

// not outputting anything for some reason
describe("alias", () => {
  test
    .stdout()
    .command(["alias", "Alice", "did:sol:alice"])
    .command(["config", "show"])
    .it("adds the alias to config", (ctx) => {
      expect(ctx.stdout).to.contain("Alice: did:sol:alice");
    });
});
