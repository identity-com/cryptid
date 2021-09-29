import { expect, test } from "@oclif/test";

// skipped until we stub solana
describe.skip("key remove", () => {
  test
    .stdout()
    .command(["key", "remove", "test"])
    .it("removes a key from the did", (ctx) => {
      expect(ctx.stdout).to.contain(
        "test: 6uYuJEc5GK8i86NkewqrFipGZpmYYoTGbYQSq5vMGkmb"
      );
    });
});
