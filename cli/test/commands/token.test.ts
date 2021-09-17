import { expect, test } from "@oclif/test";

describe("token", () => {
  test
    .stdout()
    .command([
      "token",
      "transfer",
      "--to",
      "AvuaRh9KiNQWFGyPV6eG8aE3M8iNGjgy7HTSNP6RhWnJ",
      "--amount",
      "1",
      "--mint",
      "3i5X9MvcJvYHmid9f9Nq3R8H5E9jtLGuotBCh4HPy1fX",
    ])
    .it("returns TODO", (ctx) => {
      expect(ctx.stdout).to.contain("TODO");
    });
});
