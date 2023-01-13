/**
 * Since this project is not completely TS, we collect some of the external types in this class.
 */
import { PublicKey } from "@solana/web3.js";

export type Account = {
  selector: {
    walletIndex: number,
    importedPubkey: PublicKey | undefined,
    ledger: boolean,
  },
  isSelected: boolean,
  address: PublicKey,
  name: string,
}
