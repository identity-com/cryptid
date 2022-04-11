import { PublicKey } from "@solana/web3.js";

export const showTokenInfoDialog = !!localStorage.getItem(
  'showTokenInfoDialog',
);

export const showSwapAddress = true;

export const DUMMY_PUBKEY = new PublicKey('Dmz4PkdgN19umuWArY3wAKaVzVuHPMjwZy9SKhVaBTk7')

export const pages = <const>[
  'Tokens',
  // 'Collectibles',
  // 'Stake',
  // 'Swap',
  // 'Connections',
  'Identity',
  'Pending',
]
export type Page = typeof pages[number]
