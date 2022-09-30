import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { createCryptid } from "./util/cryptid";
import { initializeDIDAccount } from "./util/did";
import { fund, createTestContext } from "./util/anchorUtils";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("create", () => {
  const { authority, provider } = createTestContext();

  before("Set up DID account", async () => {
    await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
    await initializeDIDAccount(authority);
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
