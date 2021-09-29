import { expect, test } from "@oclif/test";

// skipped until we stub solana
describe.skip("key add", () => {
  test
    .stdout()
    .command([
      "key",
      "add",
      "6uYuJEc5GK8i86NkewqrFipGZpmYYoTGbYQSq5vMGkmb",
      "test",
    ])
    .it("adds a key to the did", (ctx) => {
      expect(ctx.stdout).to.contain(
        "test: 6uYuJEc5GK8i86NkewqrFipGZpmYYoTGbYQSq5vMGkmb"
      );
    });
});
