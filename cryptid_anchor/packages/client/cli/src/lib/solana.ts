import {
  AccountInfo,
  Connection,
  ParsedAccountData,
  PublicKey,
  RpcResponseAndContext,
} from '@solana/web3.js'
import {TOKEN_PROGRAM_ID} from '@solana/spl-token'

export const safeParsePubkey = (address: string): PublicKey | null => {
  try {
    return new PublicKey(address)
  } catch {
    return null
  }
}

export const getOwnedTokenAccounts = (
  connection: Connection,
  publicKey: PublicKey,
): Promise<
  RpcResponseAndContext<
    Array<{ pubkey: PublicKey; account: AccountInfo<ParsedAccountData> }>
  >
> =>
  connection.getParsedTokenAccountsByOwner(publicKey, {
    programId: TOKEN_PROGRAM_ID,
  })
