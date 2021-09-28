import { expect, test } from "@oclif/test";

// skipped until we stub solana
describe.skip("token:balance", () => {
  test
    .stdout()
    .command([
      "token",
      "balance",
      "6D19AhQbHKHb9VParwRFH1LgEuN9dJ9rN9UPxswreUkf",
    ])
    .it("shows a token balance", (ctx) => {
      expect(ctx.stdout).to.contain("10");
    });
});
