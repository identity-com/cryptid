import { expect, test } from "@oclif/test";

describe("token:balance", () => {
  test
    .stdout()
    .command(["token:balance"])
    .it("runs hello", (ctx) => {
      expect(ctx.stdout).to.contain("hello world");
    });

  test
    .stdout()
    .command(["token:balance", "--name", "jeff"])
    .it("runs hello --name jeff", (ctx) => {
      expect(ctx.stdout).to.contain("hello jeff");
    });
});
