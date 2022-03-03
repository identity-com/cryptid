import { expect, test } from "@oclif/test";

describe("address", () => {
  test
    .stdout()
    .command(["address"])
    .it("shows the address", (ctx) => {
      expect(ctx.stdout).to.contain(
        "3BMioQBfrQcxTFRSv4Sg51jdLau2pVbHxYJ5U24Z8Yfw"
      );
    });
});
