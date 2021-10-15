import { build as buildCryptid, Cryptid, util } from "@identity.com/cryptid";
import { Config } from "../config";
import { VerificationMethod } from "did-resolver";
import { PublicKey } from "@solana/web3.js";
import { getOwnedTokenAccounts, safeParsePubkey } from "../../lib/solana";

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

export const airdrop = async (
  cryptid: Cryptid,
  config: Config,
  amount: number
): Promise<void> => {
  const key = config.keypair.publicKey;
  const doaSigner = await cryptid.address();

  await Promise.all([
    config.connection.requestAirdrop(key, amount),
    config.connection.requestAirdrop(doaSigner, amount),
  ]);
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
