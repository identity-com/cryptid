import {Keypair, LAMPORTS_PER_SOL, PublicKey} from "@solana/web3.js";
import {AnchorProvider, Program, Provider} from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import { Cryptid, CheckPass, CheckRecipient, TimeDelay } from "@identity.com/cryptid-idl";

const envProvider = anchor.AnchorProvider.env();
const envProgram = anchor.workspace.CryptidAnchor as Program<Cryptid>;

const envCheckRecipientMiddlewareProgram = anchor.workspace.CheckRecipient as Program<CheckRecipient>;
const envCheckPassMiddlewareProgram = anchor.workspace.CheckPass as Program<CheckPass>;
const envTimeDelayMiddlewareProgram = anchor.workspace.TimeDelay as Program<TimeDelay>;

if (!process.env.QUIET) {
    envProvider.connection.onLogs("all", (log) =>
        console.log(log.logs)
    );
}

// The exported Anchor wallet type is messed up at the moment, so we define it indirectly here
export type Wallet = AnchorProvider['wallet'];

export const fund = async (publicKey: PublicKey, amount: number = LAMPORTS_PER_SOL) => {
    const blockhash = await envProvider.connection.getLatestBlockhash();
    const tx = await envProvider.connection.requestAirdrop(publicKey, amount);
    // wait for the airdrop
    await envProvider.connection.confirmTransaction({
        ...blockhash, signature: tx
    }, 'confirmed');
}

export const balanceOf = (publicKey: PublicKey):Promise<number> => envProvider.connection.getAccountInfo(publicKey).then(a => a ? a.lamports : 0);

export type CryptidTestContext = {
    program: Program<Cryptid>,
    provider: Provider,
    authority: Wallet,
    keypair: Keypair,
    middleware: {
        checkRecipient : Program<CheckRecipient>
        checkPass : Program<CheckPass>
        timeDelay : Program<TimeDelay>
    }
}

export const createTestContext = (): CryptidTestContext => {
    const keypair = anchor.web3.Keypair.generate();
    const anchorProvider = new AnchorProvider(envProvider.connection, new anchor.Wallet(keypair), envProvider.opts);

    const program = new Program<Cryptid>(envProgram.idl, envProgram.programId, anchorProvider);
    const provider = program.provider as anchor.AnchorProvider;
    const authority = provider.wallet;

    const checkRecipientMiddlewareProgram = new Program<CheckRecipient>(envCheckRecipientMiddlewareProgram.idl, envCheckRecipientMiddlewareProgram.programId, anchorProvider);
    const checkPassMiddlewareProgram = new Program<CheckPass>(envCheckPassMiddlewareProgram.idl, envCheckPassMiddlewareProgram.programId, anchorProvider);
    const timeDelayMiddlewareProgram = new Program<TimeDelay>(envTimeDelayMiddlewareProgram.idl, envTimeDelayMiddlewareProgram.programId, anchorProvider);

    return {
        program,
        provider,
        authority,
        keypair,
        middleware: {
            checkRecipient: checkRecipientMiddlewareProgram,
            checkPass: checkPassMiddlewareProgram,
            timeDelay: timeDelayMiddlewareProgram
        }
    }
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));