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
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createTransferInstruction,
} from "@solana/spl-token";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`Native & SPL Transfer tests`, () => {
  const { authority, provider } = createTestContext();

  let cryptid: CryptidClient;
  let cryptidAta: Account;
  let authorityAta: Account;
  const mintAuthority = Keypair.generate();
  let mint: PublicKey;
  const thridParty = Keypair.generate();
  let thirdPartyAta: Account;

  const did = DID_SOL_PREFIX + ":" + authority.publicKey;

  const SPL_DECIMALS = 9;

  const makeSPLTransfer = (
    from: PublicKey,
    to: PublicKey,
    owner: PublicKey
  ): Transaction =>
    // A transaction that sends 1 SOL to the recipient
    new Transaction().add(
      createTransferInstruction(from, to, owner, 10 ** SPL_DECIMALS)
    );

  const splBalanceOf = (publicKey: PublicKey): Promise<bigint> =>
    getAccount(provider.connection, publicKey).then(
      (account) => account.amount
    );

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
      SPL_DECIMALS // We are using 9 to match the CLI decimal default exactly
    );

    cryptidAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      mintAuthority,
      mint,
      cryptid.address(),
      true
    );

    authorityAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      mintAuthority,
      mint,
      authority.publicKey
    );

    await mintTo(
      provider.connection,
      mintAuthority,
      mint,
      cryptidAta.address,
      mintAuthority,
      20 * 10 ** SPL_DECIMALS
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

    await mintTo(
      provider.connection,
      mintAuthority,
      mint,
      thirdPartyAta.address,
      mintAuthority,
      20 * 10 ** SPL_DECIMALS
    );
  });

  it("can send SOL to CryptidAddress and CryptidAddress can send SOL out", async () => {
    const previousBalance = await balanceOf(cryptid.address());

    const transaction = new Transaction().add(
      makeTransfer(thridParty.publicKey, cryptid.address()),
      makeTransfer(cryptid.address(), authority.publicKey)
    );

    const { proposeTransaction, proposeSigners, transactionAccount } =
      await cryptid.propose(transaction);
    await cryptid.send(proposeTransaction, [...proposeSigners]);

    const { transactions, signers } = await cryptid.execute(transactionAccount);

    await cryptid.send(transactions[0], [...signers, thridParty]);

    const currentBalance = await balanceOf(cryptid.address());

    // No Change.
    expect(previousBalance - currentBalance).to.equal(0);
  });

  it("can send SPL to CryptidAddress and CryptidAddress can send SPL out", async () => {
    const previousBalance = await splBalanceOf(cryptidAta.address);

    const transaction = new Transaction().add(
      makeSPLTransfer(
        thirdPartyAta.address,
        cryptidAta.address,
        thirdPartyAta.owner
      ),
      makeSPLTransfer(
        cryptidAta.address,
        authorityAta.address,
        cryptidAta.owner
      )
    );

    const { proposeTransaction, proposeSigners, transactionAccount } =
      await cryptid.propose(transaction);
    await cryptid.send(proposeTransaction, [...proposeSigners]);

    const { transactions, signers } = await cryptid.execute(transactionAccount);

    await cryptid.send(transactions[0], [...signers, thridParty]);

    const currentBalance = await splBalanceOf(cryptidAta.address);

    // No Change.
    expect(previousBalance - currentBalance).to.equal(BigInt(0));
  });

  it("can send SOL to thirdParty and CryptidAddress can send SOL out", async () => {
    const previousBalance = await balanceOf(cryptid.address());

    const transaction = new Transaction().add(
      makeTransfer(thridParty.publicKey, authority.publicKey),
      makeTransfer(cryptid.address(), authority.publicKey)
    );

    const { proposeTransaction, proposeSigners, transactionAccount } =
      await cryptid.propose(transaction);
    await cryptid.send(proposeTransaction, [...proposeSigners]);

    const { transactions, signers } = await cryptid.execute(transactionAccount);

    await cryptid.send(transactions[0], [...signers, thridParty]);

    const currentBalance = await balanceOf(cryptid.address());

    expect(previousBalance - currentBalance).to.equal(LAMPORTS_PER_SOL);
  });

  it("can send SPL to thirdParty and CryptidAddress can send SPL out", async () => {
    const previousBalance = await splBalanceOf(cryptidAta.address);

    const transaction = new Transaction().add(
      makeSPLTransfer(
        thirdPartyAta.address,
        authorityAta.address,
        thirdPartyAta.owner
      ),
      makeSPLTransfer(
        cryptidAta.address,
        authorityAta.address,
        cryptidAta.owner
      )
    );

    const { proposeTransaction, proposeSigners, transactionAccount } =
      await cryptid.propose(transaction);
    await cryptid.send(proposeTransaction, [...proposeSigners]);

    const { transactions, signers } = await cryptid.execute(transactionAccount);

    await cryptid.send(transactions[0], [...signers, thridParty]);

    const currentBalance = await splBalanceOf(cryptidAta.address);

    // No Change.
    expect(previousBalance - currentBalance).to.equal(
      BigInt(10 ** SPL_DECIMALS)
    );
  });
});
