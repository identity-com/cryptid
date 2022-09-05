import {Keypair, PublicKey} from "@solana/web3.js";
import {AnchorProvider, Program, Provider} from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import {CryptidAnchor} from "../../target/types/cryptid_anchor";
import {CheckRecipient} from "../../target/types/check_recipient";
import {TimeDelay} from "../../target/types/time_delay";

const envProvider = anchor.AnchorProvider.env();
const envProgram = anchor.workspace.CryptidAnchor as Program<CryptidAnchor>;

const envCheckRecipientMiddlewareProgram = anchor.workspace.CheckRecipient as Program<CheckRecipient>;
const envTimeDelayMiddlewareProgram = anchor.workspace.TimeDelay as Program<TimeDelay>;

if (!process.env.QUIET) {
    envProvider.connection.onLogs("all", (log) =>
        console.log(log.logs)
    );
}

// The exported Anchor wallet type is messed up at the moment, so we define it indirectly here
export type Wallet = AnchorProvider['wallet'];

export const fund = async (publicKey: PublicKey, amount: number) => {
    const blockhash = await envProvider.connection.getLatestBlockhash();
    const tx = await envProvider.connection.requestAirdrop(publicKey, amount);
    // wait for the airdrop
    await envProvider.connection.confirmTransaction({
        ...blockhash, signature: tx
    });
}

export const balanceOf = (publicKey: PublicKey):Promise<number> => envProvider.connection.getAccountInfo(publicKey).then(a => a ? a.lamports : 0);

export type CryptidTestContext = {
    program: Program<CryptidAnchor>,
    provider: Provider,
    authority: Wallet,
    keypair: Keypair,
    middleware: {
        checkRecipient : Program<CheckRecipient>
        timeDelay : Program<TimeDelay>
    }
}

export const createTestContext = (): CryptidTestContext => {
    const keypair = anchor.web3.Keypair.generate();
    const anchorProvider = new AnchorProvider(envProvider.connection, new anchor.Wallet(keypair), envProvider.opts);

    const program = new Program<CryptidAnchor>(envProgram.idl, envProgram.programId, anchorProvider);
    const provider = program.provider as anchor.AnchorProvider;
    const authority = provider.wallet;

    const checkRecipientMiddlewareProgram = new Program<CheckRecipient>(envCheckRecipientMiddlewareProgram.idl, envCheckRecipientMiddlewareProgram.programId, anchorProvider);
    const timeDelayMiddlewareProgram = new Program<TimeDelay>(envTimeDelayMiddlewareProgram.idl, envTimeDelayMiddlewareProgram.programId, anchorProvider);

    return {
        program,
        provider,
        authority,
        keypair,
        middleware: {
            checkRecipient: checkRecipientMiddlewareProgram,
            timeDelay: timeDelayMiddlewareProgram
        }
    }
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));