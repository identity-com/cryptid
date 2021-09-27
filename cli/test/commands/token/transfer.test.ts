import { expect, test } from "@oclif/test";

describe("token:transfer", () => {
  test
    .stdout()
    .command(["token:transfer"])
    .it("runs hello", (ctx) => {
      expect(ctx.stdout).to.contain("hello world");
    });

  test
    .stdout()
    .command(["token:transfer", "--name", "jeff"])
    .it("runs hello --name jeff", (ctx) => {
      expect(ctx.stdout).to.contain("hello jeff");
    });
});
