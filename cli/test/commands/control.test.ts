import { expect, test } from "@oclif/test";

// skipped until we stub solana
describe.skip("control", () => {
  test
    .stdout()
    .command(["control"])
    .it("shows TODO", (ctx) => {
      expect(ctx.stdout).to.contain("TODO");
    });
});
