import { build as buildCryptid, Cryptid, util } from "@identity.com/cryptid";
import { Config } from "../config";
import { VerificationMethod } from "did-resolver";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { getOwnedTokenAccounts, safeParsePubkey } from "../../lib/solana";

const KEY_RESERVE_AIRDROP_LAMPORTS = 500_000;

export const build = (config: Config, asDid: string | undefined): Cryptid => {
  const cryptid = buildCryptid(config.did, config.keypair, {
    connection: config.connection,
  });

  if (asDid) return cryptid.as(asDid);

  return cryptid;
};

export const balance = async (
  cryptid: Cryptid,
  config: Config
): Promise<number> => {
  const address = await cryptid.address();
  return config.connection.getBalance(address);
};

const makeTransferTransaction = async (
  config: Config,
  from: PublicKey,
  recipient: PublicKey,
  amount: number
): Promise<Transaction> => {
  const { blockhash: recentBlockhash } =
    await config.connection.getRecentBlockhash();

  return new Transaction({
    recentBlockhash,
    feePayer: config.keypair.publicKey,
  }).add(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: recipient,
      lamports: amount,
    })
  );
};

export const airdrop = async (
  cryptid: Cryptid,
  config: Config,
  amount: number,
  log: (message?: string, ...args: string[]) => void
): Promise<void> => {
  const key = config.keypair.publicKey;
  const cryptidAddress = await cryptid.address();

  if (amount < KEY_RESERVE_AIRDROP_LAMPORTS) {
    throw new Error(
      `Airdrop amount ${amount} too low. Must be ${KEY_RESERVE_AIRDROP_LAMPORTS} lamports or more`
    );
  }

  let keyBalance = await config.connection.getBalance(key);
  let cryptidBalance = await config.connection.getBalance(cryptidAddress);

  log(
    `Airdropping ${amount} to signer key (current balances: key: ${keyBalance}, cryptid: ${cryptidBalance})`
  );
  // To avoid rate limiting, airdrop into the key address, then transfer most of it to cryptid
  const airdropTx = await config.connection.requestAirdrop(key, amount);
  await config.connection.confirmTransaction(airdropTx);

  keyBalance = await config.connection.getBalance(key);
  cryptidBalance = await config.connection.getBalance(cryptidAddress);

  const amountToTransferToCryptid = amount - KEY_RESERVE_AIRDROP_LAMPORTS;
  log(
    `Transferring ${amountToTransferToCryptid} from signer key to cryptid (current balances: key: ${keyBalance}, cryptid: ${cryptidBalance})`
  );

  const transferTx = await makeTransferTransaction(
    config,
    key,
    cryptidAddress,
    amountToTransferToCryptid
  );
  const txSignature = await config.connection.sendTransaction(transferTx, [
    config.keypair,
  ]);
  await config.connection.confirmTransaction(txSignature);

  keyBalance = await config.connection.getBalance(key);
  cryptidBalance = await config.connection.getBalance(cryptidAddress);
  log(
    `Transfer complete - (current balances: key: ${keyBalance}, cryptid: ${cryptidBalance})`
  );
};

export const transfer = async (
  cryptid: Cryptid,
  config: Config,
  recipient: PublicKey,
  amount: number
): Promise<string> => {
  const address = await cryptid.address();
  const tx = await makeTransferTransaction(config, address, recipient, amount);

  const [signedTx] = await cryptid.sign(tx);
  const txSignature = await config.connection.sendRawTransaction(
    signedTx.serialize()
  );
  await config.connection.confirmTransaction(txSignature);
  return txSignature;
};

export const getKeys = async (cryptid: Cryptid): Promise<string[]> => {
  const doc = await cryptid.document();
  return (doc.verificationMethod || [])
    .map((verificationMethod: VerificationMethod) => ({
      alias: verificationMethod.id.substring(
        verificationMethod.id.indexOf("#") + 1
      ),
      key: verificationMethod.publicKeyBase58,
    }))
    .map(
      ({ alias, key }: { alias: string; key: string | undefined }) =>
        `${alias}: ${key}`
    );
};

export const getControllers = async (cryptid: Cryptid): Promise<string[]> => {
  const doc = await cryptid.document();
  return (doc.controller || []) as string[];
};

export const getRecipientAddressForDid = async (
  did: string
): Promise<PublicKey> => util.didToDefaultDOASigner(did);

export const resolveRecipient = async (
  recipient: string,
  config: Config
): Promise<PublicKey> => {
  if (safeParsePubkey(recipient))
    return safeParsePubkey(recipient) as PublicKey;
  if (config.config.aliases[recipient])
    return getRecipientAddressForDid(config.config.aliases[recipient]);
  if (recipient.startsWith("did:sol:"))
    return getRecipientAddressForDid(recipient);

  throw new Error(`Cannot get address for recipient ${recipient}`);
};

export type TokenDetails = {
  address: PublicKey;
  mint: PublicKey;
  balance: string;
  decimals: number;
};
export const getTokenAccounts = async (
  cryptid: Cryptid,
  config: Config
): Promise<TokenDetails[]> => {
  const address = await cryptid.address();
  const accountsWrapper = await getOwnedTokenAccounts(
    config.connection,
    address
  );

  return accountsWrapper.value.map(({ pubkey, account }) => ({
    address: pubkey,
    mint: new PublicKey(account.data.parsed.info.mint),
    balance: account.data.parsed.info.tokenAmount.amount,
    decimals: account.data.parsed.info.tokenAmount.decimals,
  }));
};
