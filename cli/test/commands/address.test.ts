import { expect, test } from "@oclif/test";

describe("address", () => {
  test
    .stdout()
    .command(["address"])
    .it("shows the address", (ctx) => {
      expect(ctx.stdout).to.contain(
        "didso1Dpqpm4CsiCjzP766BGY89CAdD6ZBL68cRhFPc"
      );
    });
});
