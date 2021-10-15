import { expect, test } from "@oclif/test";

// skipping until transfer works
describe.skip("transfer", () => {
  test
    .stdout()
    .command([
      "transfer",
      "--to",
      "AvuaRh9KiNQWFGyPV6eG8aE3M8iNGjgy7HTSNP6RhWnJ",
      "--amount",
      "1",
    ])
    .it("sends a transaction", (ctx) => {
      expect(ctx.stdout).to.contain("hello world");
    });
});
