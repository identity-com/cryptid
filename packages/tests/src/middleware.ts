import { DID_SOL_PREFIX } from "@identity.com/sol-did-client";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { cryptidTransferInstruction, makeTransfer } from "./util/cryptid";
import { initializeDIDAccount } from "./util/did";
import { createTestContext, fund } from "./util/anchorUtils";
import { Cryptid, CryptidClient } from "@identity.com/cryptid";

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`Middleware`, () => {
  const { program, authority, provider } = createTestContext();

  let cryptid: CryptidClient;
  let transactionAccount: PublicKey;

  const did = DID_SOL_PREFIX + ":" + authority.publicKey;

  // use this when testing against the cryptid client
  const makeTransaction = (recipient: PublicKey) =>
    makeTransfer(cryptid.address(), recipient);

  before(`Set up non-generative DID account`, async () => {
    await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
    await initializeDIDAccount(authority);
  });

  before(`Set up a non-generative Cryptid Account and propose TX`, async () => {
    cryptid = await Cryptid.createFromDID(did, authority, [], {
      connection: provider.connection,
    });

    const proposeResult = await cryptid.propose(
      makeTransaction(authority.publicKey)
    );
    await cryptid.send(
      proposeResult.proposeTransaction,
      proposeResult.proposeSigners
    );
    transactionAccount = proposeResult.transactionAccount;

    await fund(cryptid.address(), 20 * LAMPORTS_PER_SOL);
  });

  it("cannot approve middleware with EOA", async () => {
    const shouldFail = program.methods
      .approveExecution()
      .accounts({
        transactionAccount,
        middlewareAccount: authority, // not a correct middleware account
      })
      .rpc();
    return expect(shouldFail).to.be.rejectedWith(
      "Error Code: InvalidMiddlewareAccount."
    );
  });
});
