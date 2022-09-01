import {PublicKey} from "@solana/web3.js";
import {AnchorProvider, Program, Provider} from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import {CryptidAnchor} from "../../target/types/cryptid_anchor";

// The exported Anchor wallet type is messed up at the moment, so we define it indirectly here
export type Wallet = AnchorProvider['wallet'];

export const fund = async (provider: Provider, publicKey: PublicKey, amount: number) => {
    const blockhash = await provider.connection.getLatestBlockhash();
    const tx = await provider.connection.requestAirdrop(publicKey, amount);
    // wait for the airdrop
    await provider.connection.confirmTransaction({
        ...blockhash, signature: tx
    });
}

export const listenToLogs = async (provider: Provider) =>
    provider.connection.onLogs("all", (log) =>
        console.log(log.logs)
    );

export const getBalance = (provider: Provider) => (publicKey: PublicKey):Promise<number> => provider.connection.getAccountInfo(publicKey).then(a => a ? a.lamports : 0);

export type CryptidTestContext = {
    program: Program<CryptidAnchor>,
    provider: Provider,
    authority: Wallet,
    balanceOf: (publicKey: PublicKey) => Promise<number>,
}

export const createTestContext = (): CryptidTestContext => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());

    const program = anchor.workspace.CryptidAnchor as Program<CryptidAnchor>;
    const provider = program.provider as anchor.AnchorProvider;

    const authority = provider.wallet;

    const balanceOf = getBalance(provider);

    listenToLogs(provider)

    return {
        program,
        provider,
        authority,
        balanceOf,
    }
};