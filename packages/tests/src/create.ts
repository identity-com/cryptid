import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { createCryptid } from "./util/cryptid";
import { getDidAccount, initializeDIDAccount } from "./util/did";
import { fund, createTestContext, Wallet } from "./util/anchorUtils";

chai.use(chaiAsPromised);
const { expect } = chai;

const testCases = [
  {
    name: "generative",
    beforeFn: async (authority: Wallet) => await getDidAccount(authority),
  },
  {
    name: "non-generative",
    beforeFn: async (authority: Wallet) =>
      await initializeDIDAccount(authority),
  },
];

testCases.forEach(({ name, beforeFn }) => {
  describe(`create (${name})`, () => {
    const { authority, provider } = createTestContext();

    before(`Set up ${name} DID account`, async () => {
      await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
      await beforeFn(authority);
    });

    it("cannot create a zero index cryptid account", async () => {
      const shouldFail = createCryptid(authority, {
        connection: provider.connection,
        accountIndex: 0,
      });

      return expect(shouldFail).to.be.rejectedWith(/CreatingWithZeroIndex/);
    });

    it("can create a simple cryptid account", async () => {
      await createCryptid(authority, {
        connection: provider.connection,
      });
    });
  });
});
