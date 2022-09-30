import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { createCryptid, deriveCryptidAccountAddress } from "./util/cryptid";
import { initializeDIDAccount } from "./util/did";
import { fund, createTestContext } from "./util/anchorUtils";
import { CryptidClient } from "@identity.com/cryptid";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("directExecute", () => {
  const { authority, provider } = createTestContext();

  let didAccount: PublicKey;
  let cryptidAccount: PublicKey;
  let cryptidBump: number;

  let cryptid: CryptidClient;

  before("Set up DID account", async () => {
    await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
    didAccount = await initializeDIDAccount(authority);
  });

  it("cannot create a zero index cryptid account", async () => {
    [cryptidAccount, cryptidBump] = deriveCryptidAccountAddress(didAccount);

    const shouldFail = createCryptid(authority, {
      connection: provider.connection,
      accountIndex: 0,
    });

    return expect(shouldFail).to.be.rejectedWith(/CreatingWithZeroIndex/);
  });

  it("can create a simple cryptid account", async () => {
    [cryptidAccount, cryptidBump] = deriveCryptidAccountAddress(didAccount);

    await createCryptid(authority, {
      connection: provider.connection,
    });
  });
});
