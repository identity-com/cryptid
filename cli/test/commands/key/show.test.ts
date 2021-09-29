import { expect, test } from "@oclif/test";

// skipped until we stub solana
describe.skip("key show", () => {
  test
    .stdout()
    .command(["key", "show"])
    .it("shows the keys on the did", (ctx) => {
      expect(ctx.stdout).to.contain(
        "default: FtMiL5EHC9ap56ZKcLYZRtyAnKVJoEqhf5JysiZXgTEm"
      );
    });
});
