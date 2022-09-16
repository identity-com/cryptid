import { expect, test } from "@oclif/test";

describe("address", () => {
  test
    .stdout()
    .command(["address"])
    .it("shows the address", (ctx) => {
      expect(ctx.stdout).to.contain(
        "Entaq3Kbeq8bYJDBTpYwvV5advNMr3x4JZoB6two59z8\n"
      );
    });
});
