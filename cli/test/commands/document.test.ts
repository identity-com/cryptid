import { expect, test } from "@oclif/test";

describe("document", () => {
  test
    .stdout()
    .command(["document"])
    .it("shows the document", (ctx) => {
      expect(ctx.stdout).to.contain("hello world");
    });

  test
    .stdout()
    .command(["document", "--name", "jeff"])
    .it("runs hello --name jeff", (ctx) => {
      expect(ctx.stdout).to.contain("hello jeff");
    });
});
