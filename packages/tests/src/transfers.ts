import { balanceOf, createTestContext, fund } from "./util/anchorUtils";
import { Cryptid, CryptidClient } from "@identity.com/cryptid-core";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { DID_SOL_PREFIX } from "@identity.com/sol-did-client";
import { makeTransfer } from "./util/cryptid";
import { initializeDIDAccount } from "./util/did";
import {
  Account,
  createMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`Native & SPL Transfer tests`, () => {
  const { authority, provider } = createTestContext();

  let cryptid: CryptidClient;
  let cryptidAta: Account;
  const mintAuthority = Keypair.generate();
  let mint: PublicKey;
  const thridParty = Keypair.generate();
  let thirdPartyAta: Account;

  const did = DID_SOL_PREFIX + ":" + authority.publicKey;

  before(`Set up non-generative DID account`, async () => {
    await fund(authority.publicKey, 10 * LAMPORTS_PER_SOL);
    await initializeDIDAccount(authority);
  });

  before(`Set up a non-generative Cryptid Account and propose TX`, async () => {
    cryptid = await Cryptid.createFromDID(did, authority, [], {
      connection: provider.connection,
    });

    await fund(cryptid.address(), 20 * LAMPORTS_PER_SOL);
  });

  before(`Set up mint`, async () => {
    await fund(mintAuthority.publicKey, 20 * LAMPORTS_PER_SOL);

    mint = await createMint(
      provider.connection,
      mintAuthority,
      mintAuthority.publicKey,
      null,
      9 // We are using 9 to match the CLI decimal default exactly
    );

    cryptidAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      mintAuthority,
      mint,
      cryptid.address(),
      true
    );
  });

  before(`Set up thrid party`, async () => {
    await fund(thridParty.publicKey, 20 * LAMPORTS_PER_SOL);

    thirdPartyAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      thridParty,
      mint,
      thridParty.publicKey
    );
  });

  it("can send SOL to CryptidAddress and CryptidAddress can send SOL out", async () => {
    const previousBalance = await balanceOf(cryptid.address());

    const transaction = new Transaction().add(
      // makeTransfer(thridParty.publicKey, cryptid.address()),
      // broken
      // makeTransfer(cryptid.address(), authority.publicKey)
      // works
      makeTransfer(cryptid.address(), thridParty.publicKey)
    );

    const { proposeTransaction, proposeSigners, transactionAccount } =
      await cryptid.propose(transaction);
    await cryptid.send(proposeTransaction, [...proposeSigners]); // TODO: Why do we need thridParty to sign the propose?

    const { executeTransactions, executeSigners } = await cryptid.execute(
      transactionAccount
    );
    const latest = await provider.connection.getLatestBlockhash();
    executeTransactions[0].recentBlockhash = latest.blockhash;
    executeTransactions[0].lastValidBlockHeight = latest.lastValidBlockHeight;
    executeTransactions[0].feePayer = authority.publicKey;


    console.log(JSON.stringify(executeTransactions[0], null, 2));
    console.log(executeTransactions[0].serializeMessage().toString("base64"));

    await cryptid.send(executeTransactions[0], [...executeSigners]);

    const currentBalance = await balanceOf(cryptid.address());

    // No Change.
    expect(previousBalance - currentBalance).to.equal(0);
  });
});
