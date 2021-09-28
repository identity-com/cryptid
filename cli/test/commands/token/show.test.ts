import { expect, test } from "@oclif/test";

// skipped until we stub solana
describe.skip("token:show", () => {
  test
    .stdout()
    .command(["token", "show"])
    .it("shows all tokens and balances", (ctx) => {
      expect(ctx.stdout).to.contain(
        "6D19AhQbHKHb9VParwRFH1LgEuN9dJ9rN9UPxswreUkf: 10"
      );
    });
});
