import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { CryptidAnchor } from "../target/types/cryptid_anchor";
import { DidSolIdentifier, ExtendedCluster, DID_SOL_PROGRAM } from "@identity.com/sol-did-client";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram, Keypair } from "@solana/web3.js";


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

    console.log(transferData);

    // TODO: even that simple case does not serialize client-side.
    const instruction = await program.methods.directExecute([], [], 0).accounts({
        cryptidAccount,
        didProgram: DID_SOL_PROGRAM,
        did: didAccount,
        signer: authority.publicKey,
      }
    ).instruction();

    console.log(JSON.stringify(instruction, null, 2));



    // const instruction = await program.methods.directExecute([], [{
    //   program_id: 0,
    //   accounts: [
    //     {
    //       key: 0,
    //       meta: 3,
    //     },
    //     {
    //       key: 4,
    //       meta: 2,
    //     }
    //     ],
    //    data: Buffer.from(new Uint8Array([1,2,3,4])),
    // }], 0).accounts({
    //   cryptidAccount,
    //   didProgram: DID_SOL_PROGRAM,
    //   did: didAccount,
    //   signer: authority.publicKey,
    //   }
    // ).remainingAccounts([{
    //   pubkey: recipient.publicKey,
    //   isWritable: true,
    //   isSigner: false,
    // }]).instruction();


    // const tx = await program.methods.directExecute([], [{
    //   program_id: 0,
    //   accounts: [
    //     {
    //       key: 0,
    //       meta: 3,
    //     },
    //     {
    //       key: 4,
    //       meta: 2,
    //     }
    //     ],
    //   // data: [],
    // }], 0).accounts({
    //   cryptidAccount,
    //   didProgram: DID_SOL_PROGRAM,
    //   did: didAccount,
    //   signer: authority.publicKey,
    //   }
    // ).remainingAccounts([{
    //   pubkey: recipient.publicKey,
    //   isWritable: true,
    //   isSigner: false,
    // }]).rpc();

    console.log("Your transaction signature", tx);
  });
});
