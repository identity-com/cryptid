import { expect, test } from "@oclif/test";

// skipped until we stub solana
describe.skip("token:transfer", () => {
  test
    .stdout()
    .command([
      "token",
      "transfer",
      "BG5vtQf8LHC8nX41gQHmMm5b9zsMY8FDbAhwGJpM2moV",
      "10",
      "-m",
      "6D19AhQbHKHb9VParwRFH1LgEuN9dJ9rN9UPxswreUkf",
      ".-f",
    ])
    .it("sends tokens", (ctx) => {
      expect(ctx.stdout).to.contain("Transaction sent");
    });
});
