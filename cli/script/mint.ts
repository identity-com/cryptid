import {build} from "@identity.com/cryptid";
import {airdrop, createAssociatedTokenAddress} from "../../client/test/utils/solana";
import {Connection, Keypair, Transaction} from "@solana/web3.js";
import {Token, TOKEN_PROGRAM_ID} from "@solana/spl-token";

console.log(process.argv);
const connection = new Connection('http://localhost:8899', 'confirmed');
const did = process.argv[2];
const signer = { publicKey: Keypair.generate().publicKey, sign: async (tx:Transaction) => tx };// unused
const cryptid = build(did, signer, { connection, waitForConfirmation: true });
const mintAuthority = Keypair.generate();

(async () => {
  const doaSigner = await cryptid.address();

  await Promise.all([
    airdrop(connection, doaSigner), // the main funds for the cryptid account
    // airdrop(connection, key.publicKey, 100_000), // to cover fees only
    airdrop(connection, mintAuthority.publicKey), // cover creating the mint and minting tokens
  ]);

  const token = await Token.createMint(
    connection, mintAuthority, mintAuthority.publicKey, null, 2, TOKEN_PROGRAM_ID
  )

  const cryptidTokenATA = await createAssociatedTokenAddress(
    connection,
    token.publicKey,
    mintAuthority,
    doaSigner
  )
  console.log('mint:' + token.publicKey.toBase58());
  console.log('ata:' + cryptidTokenATA.toBase58());
  await token.mintTo(cryptidTokenATA, mintAuthority, [], 10_000_000);
})().catch((e => console.error(e)));
