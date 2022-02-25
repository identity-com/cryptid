import { expect, test } from "@oclif/test";

describe("address", () => {
  test
    .stdout()
    .command(["address"])
    .it("shows the address", (ctx) => {
      expect(ctx.stdout).to.contain(
        "EUxLMi2Km3s9wxygRbAR3KKRBoQQZV1p8HAqyu3Dok8k"
      );
    });
});
