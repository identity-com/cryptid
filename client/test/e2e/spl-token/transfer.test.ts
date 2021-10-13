import chai from 'chai';

import { build, Cryptid } from '../../../src';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {
  airdrop,
  createAssociatedTokenAddress, createTokenTransferTransaction, createTransaction, getAssociatedTokenAccount,
  sendAndConfirmCryptidTransaction,
} from '../../utils/solana';
import { publicKeyToDid } from '../../../src/lib/solana/util';


const { expect } = chai;

const tokensToTransfer = 1000;

describe('SPL-Token transfers', function () {
  this.timeout(20_000);
  let connection: Connection;

  let key: Keypair;
  let did: string;
  let doaSigner: PublicKey;
  let recipient: PublicKey;

  let cryptid: Cryptid;

  let token: Token;
  let cryptidTokenATA: PublicKey;
  let recipientATA: PublicKey;
  let mintAuthority: Keypair;

  before(async () => {
    connection = new Connection('http://localhost:8899', 'confirmed');
    key = Keypair.generate();
    did = publicKeyToDid(key.publicKey, 'localnet');
    recipient = Keypair.generate().publicKey;
    mintAuthority = Keypair.generate();

    cryptid = build(did, key, { connection, waitForConfirmation: true });

    doaSigner = await cryptid.address();

    await Promise.all([
      airdrop(connection, doaSigner), // the main funds for the cryptid account
      airdrop(connection, key.publicKey, 5_000_000), // to cover fees only
      airdrop(connection, mintAuthority.publicKey), // cover creating the mint and minting tokens
    ]);

    token = await Token.createMint(
      connection, mintAuthority, mintAuthority.publicKey, null, 2, TOKEN_PROGRAM_ID
    )

    cryptidTokenATA = await createAssociatedTokenAddress(
      connection,
      token.publicKey,
      mintAuthority,
      doaSigner
    )
    recipientATA = await createAssociatedTokenAddress(
      connection,
      token.publicKey,
      mintAuthority,
      recipient
    )
    await token.mintTo(cryptidTokenATA, mintAuthority, [], 10_000_000);
  });

  context('a simple cryptid', () => {
    it.skip('should create an ATA for another cryptid account', async () => {
      const cryptid = build(did, key, { connection });

      const recipientCryptidKey = Keypair.generate();
      did = publicKeyToDid(recipientCryptidKey.publicKey, 'localnet');
      const recipientCryptid = build(did, recipientCryptidKey, { connection });
      const recipientAddress = await recipientCryptid.address();

      const newToken = await Token.createMint(
        connection, mintAuthority, mintAuthority.publicKey, null, 2, TOKEN_PROGRAM_ID
      )

      const associatedTokenAccount = await getAssociatedTokenAccount(
        newToken.publicKey,
        recipientAddress
      );
      const createATAInstruction = Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        newToken.publicKey,
        associatedTokenAccount,
        recipientAddress,
        doaSigner
      );
      const transaction = await createTransaction(connection, doaSigner, [
        createATAInstruction,
      ]);

      const [cryptidTx] = await cryptid.sign(transaction);
      await sendAndConfirmCryptidTransaction(connection, cryptidTx);
    });

    it('should send tokens from a DID', async () => {
      const cryptid = build(did, key, { connection });

      const tx = await createTokenTransferTransaction(
        connection,
        token.publicKey,
        doaSigner,
        recipientATA,
        tokensToTransfer
      );

      // @ts-ignore (there is a type issue in spl-token that does not recognise toNumber as being on u64)
      const tokenBalanceBefore = (await token.getAccountInfo(cryptidTokenATA)).amount.toNumber();

      const [cryptidTx] = await cryptid.sign(tx);
      await sendAndConfirmCryptidTransaction(connection, cryptidTx);

      // @ts-ignore (there is a type issue in spl-token that does not recognise toNumber as being on u64)
      const tokenBalanceAfter = (await token.getAccountInfo(cryptidTokenATA)).amount.toNumber();

      expect(tokenBalanceAfter-tokenBalanceBefore).to.equal(-tokensToTransfer);
    });

    it('should create a recipient ATA', async () => {
      const recipientSOL = Keypair.generate().publicKey
      const cryptid = build(did, key, { connection });
      const recipientATA = await getAssociatedTokenAccount(token.publicKey, recipientSOL);

      const createATAInstruction = Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        token.publicKey,
        recipientATA,
        recipientSOL,
        doaSigner
      );
      const tx = await createTransaction(connection, doaSigner, [createATAInstruction])

      const [cryptidTx] = await cryptid.sign(tx);
      await sendAndConfirmCryptidTransaction(connection, cryptidTx);

      const createdAccount = await connection.getAccountInfo(recipientATA);
      expect(createdAccount?.owner.toString()).to.equal(TOKEN_PROGRAM_ID.toString());
    });

    it('should create the recipient ATA and send tokens in two transactions', async () => {
      const recipientSOL = Keypair.generate().publicKey
      const cryptid = build(did, key, { connection });
      const cryptidATA = await getAssociatedTokenAccount(
        token.publicKey,
        doaSigner
      );
      const recipientATA = await getAssociatedTokenAccount(
        token.publicKey,
        recipientSOL,
      );

      const createATAInstruction = Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        token.publicKey,
        recipientATA,
        recipientSOL,
        doaSigner
      );
      const tx1 = await createTransaction(connection, doaSigner, [createATAInstruction]);

      const transferInstruction = Token.createTransferInstruction(
        TOKEN_PROGRAM_ID,
        cryptidATA,
        recipientATA,
        doaSigner,
        [],
        tokensToTransfer
      );
      const tx2 = await createTransaction(connection, doaSigner, [transferInstruction]);

      // @ts-ignore (there is a type issue in spl-token that does not recognise toNumber as being on u64)
      const tokenBalanceBefore = (await token.getAccountInfo(cryptidTokenATA)).amount.toNumber();

      // send the txes
      console.log("Creating ATA");
      const [cryptidTx1] = await cryptid.sign(tx1);
      await sendAndConfirmCryptidTransaction(connection, cryptidTx1);

      console.log("ATA created");

      const [cryptidTx2] = await cryptid.sign(tx2);
      await sendAndConfirmCryptidTransaction(connection, cryptidTx2);

      console.log("Transfer complete");

      // @ts-ignore (there is a type issue in spl-token that does not recognise toNumber as being on u64)
      const tokenBalanceAfter = (await token.getAccountInfo(cryptidTokenATA)).amount.toNumber();

      expect(tokenBalanceAfter-tokenBalanceBefore).to.equal(-tokensToTransfer);
    });

    it('should create the recipient ATA and send tokens in one transaction', async () => {
      const recipientSOL = Keypair.generate().publicKey
      const cryptid = build(did, key, { connection });
      const cryptidATA = await getAssociatedTokenAccount(
        token.publicKey,
        doaSigner
      );
      const recipientATA = await getAssociatedTokenAccount(
        token.publicKey,
        recipientSOL,
      );

      const createATAInstruction = Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        token.publicKey,
        recipientATA,
        recipientSOL,
        doaSigner
      );
      const transferInstruction = Token.createTransferInstruction(
        TOKEN_PROGRAM_ID,
        cryptidATA,
        recipientATA,
        doaSigner,
        [],
        tokensToTransfer
      );
      const tx = await createTransaction(connection, doaSigner, [createATAInstruction, transferInstruction]);

      // @ts-ignore (there is a type issue in spl-token that does not recognise toNumber as being on u64)
      const tokenBalanceBefore = (await token.getAccountInfo(cryptidTokenATA)).amount.toNumber();

      const [cryptidTx] = await cryptid.sign(tx);
      await sendAndConfirmCryptidTransaction(connection, cryptidTx);

      // @ts-ignore (there is a type issue in spl-token that does not recognise toNumber as being on u64)
      const tokenBalanceAfter = (await token.getAccountInfo(cryptidTokenATA)).amount.toNumber();

      expect(tokenBalanceAfter-tokenBalanceBefore).to.equal(-tokensToTransfer);
    });
  });
});
