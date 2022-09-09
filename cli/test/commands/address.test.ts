import { expect, test } from "@oclif/test";

describe("address", () => {
  test
    .stdout()
    .command(["address"])
    .it("shows the address", (ctx) => {
      expect(ctx.stdout).to.contain(
        "4sAzrEcFhiLoDCKX3NBxoBAhzELTKRBhFdDXVfccv73J\n"
      );
    });
});
