import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { CryptidAnchor } from "../target/types/cryptid_anchor";
import { DidSolIdentifier, ExtendedCluster, DID_SOL_PROGRAM, DidSolService } from "@identity.com/sol-did-client";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram, Keypair } from "@solana/web3.js";
import chai, { expect } from 'chai';


describe("cryptid_anchor", () => {
  // Configure the client to use the local cluster.

  const CRYPTID_PROGRAM = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');


  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.CryptidAnchor as Program<CryptidAnchor>;
  const programProvider = program.provider as anchor.AnchorProvider;

  const authority = programProvider.wallet;
  const cluster: ExtendedCluster = 'localnet';


  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });

  it("Can transfer through Cryptid!", async () => {
    // Add your test here.
    const did = DidSolIdentifier.create(authority.publicKey, cluster);
    const [didAccount] = await did.dataAccount();

    // Initialize a DID because the generative case is not working yet.
    const didSolService = await DidSolService.build(did, undefined, authority);
    await didSolService.initialize(10_000).rpc();

    // Cryptid Account
    const [cryptidAccount] = await PublicKey.findProgramAddress(
      [anchor.utils.bytes.utf8.encode("cryptid_account"),
        DID_SOL_PROGRAM.toBuffer(),
      didAccount.toBuffer()],
      CRYPTID_PROGRAM
    );

    const recipient = Keypair.generate();

    await programProvider.connection.requestAirdrop(cryptidAccount, 2 * LAMPORTS_PER_SOL);

    const transferData = SystemProgram.transfer({
      fromPubkey: PublicKey.default,
      lamports: LAMPORTS_PER_SOL, // 1 SOL
      toPubkey: PublicKey.default,
    }).data;


    const tx = await program.methods.directExecute(Buffer.from([]), [{
      program_id: 5,
      accounts: [
        {
          key: 0,
          meta: 3,
        },
        {
          key: 4,
          meta: 2,
        }
        ],
       data: transferData,
    }], 0).accounts({
      cryptidAccount,
      didProgram: DID_SOL_PROGRAM,
      did: didAccount,
      signer: authority.publicKey,
      }
    ).remainingAccounts([{
      pubkey: recipient.publicKey,
      isWritable: true,
      isSigner: false,
    },{
      pubkey: SystemProgram.programId,
      isWritable: false,
      isSigner: false,
    }]).rpc();

    const lamports = await programProvider.connection.getAccountInfo(cryptidAccount).then(a => a.lamports);
    expect(lamports).to.equal(LAMPORTS_PER_SOL); // Should have lost 1 SOL

    console.log("Your transaction signature", tx);
  });
});
