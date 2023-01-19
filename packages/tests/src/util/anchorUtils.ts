import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import {
  CheckDid,
  CheckPass,
  CheckRecipient,
  Cryptid,
  TimeDelay,
  SuperuserCheckSigner,
} from "@identity.com/cryptid-idl";

const envProvider = anchor.AnchorProvider.env();
const envProgram = anchor.workspace.Cryptid as Program<Cryptid>;

const envCheckRecipientMiddlewareProgram = anchor.workspace
  .CheckRecipient as Program<CheckRecipient>;
const envCheckPassMiddlewareProgram = anchor.workspace
  .CheckPass as Program<CheckPass>;
const envCheckDidMiddlewareProgram = anchor.workspace
  .CheckDid as Program<CheckDid>;
const envTimeDelayMiddlewareProgram = anchor.workspace
  .TimeDelay as Program<TimeDelay>;
const envSuperuserCheckSignerMiddlewareProgram = anchor.workspace
  .SuperuserCheckSigner as Program<SuperuserCheckSigner>;

if (!process.env.QUIET) {
  const logListener = envProvider.connection.onLogs("all", (log) =>
    console.log(log.logs)
  );

  after("Remove log listener", () => {
    envProvider.connection.removeOnLogsListener(logListener);
  });
}
// The exported Anchor wallet type is messed up at the moment, so we define it indirectly here
export type Wallet = AnchorProvider["wallet"];

export const confirm = async (txSig: string): Promise<void> => {
  const blockhash = await envProvider.connection.getLatestBlockhash();
  await envProvider.connection.confirmTransaction(
    {
      ...blockhash,
      signature: txSig,
    },
    "confirmed"
  );
};

export const fund = async (
  publicKey: PublicKey,
  amount: number = LAMPORTS_PER_SOL
): Promise<void> => {
  await envProvider.connection.requestAirdrop(publicKey, amount).then(confirm);
};

export const balanceOf = (publicKey: PublicKey): Promise<number> =>
  envProvider.connection
    .getAccountInfo(publicKey)
    .then((a) => (a ? a.lamports : 0));

export type CryptidTestContext = {
  program: Program<Cryptid>;
  provider: anchor.AnchorProvider;
  authority: Wallet;
  keypair: Keypair;
  middleware: {
    checkRecipient: Program<CheckRecipient>;
    checkPass: Program<CheckPass>;
    checkDid: Program<CheckDid>;
    timeDelay: Program<TimeDelay>;
    superuserCheckSigner: Program<SuperuserCheckSigner>;
  };
};

export const createTestContext = (): CryptidTestContext => {
  const keypair = anchor.web3.Keypair.generate();
  const anchorProvider = new AnchorProvider(
    envProvider.connection,
    new anchor.Wallet(keypair),
    envProvider.opts
  );

  const program = new Program<Cryptid>(
    envProgram.idl,
    envProgram.programId,
    anchorProvider
  );
  const provider = program.provider as anchor.AnchorProvider;
  const authority = provider.wallet;

  const checkRecipientMiddlewareProgram = new Program<CheckRecipient>(
    envCheckRecipientMiddlewareProgram.idl,
    envCheckRecipientMiddlewareProgram.programId,
    anchorProvider
  );
  const checkPassMiddlewareProgram = new Program<CheckPass>(
    envCheckPassMiddlewareProgram.idl,
    envCheckPassMiddlewareProgram.programId,
    anchorProvider
  );
  const checkDidMiddlewareProgram = new Program<CheckDid>(
    envCheckDidMiddlewareProgram.idl,
    envCheckDidMiddlewareProgram.programId,
    anchorProvider
  );
  const timeDelayMiddlewareProgram = new Program<TimeDelay>(
    envTimeDelayMiddlewareProgram.idl,
    envTimeDelayMiddlewareProgram.programId,
    anchorProvider
  );
  const superuserCheckSignerMiddlewareProgram =
    new Program<SuperuserCheckSigner>(
      envSuperuserCheckSignerMiddlewareProgram.idl,
      envSuperuserCheckSignerMiddlewareProgram.programId,
      anchorProvider
    );

  return {
    program,
    provider,
    authority,
    keypair,
    middleware: {
      checkRecipient: checkRecipientMiddlewareProgram,
      checkPass: checkPassMiddlewareProgram,
      checkDid: checkDidMiddlewareProgram,
      timeDelay: timeDelayMiddlewareProgram,
      superuserCheckSigner: superuserCheckSignerMiddlewareProgram,
    },
  };
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
