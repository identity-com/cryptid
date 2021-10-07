export const showTokenInfoDialog = !!localStorage.getItem(
  'showTokenInfoDialog',
);

export const showSwapAddress = true;


export const pages = <const>[
  'Tokens',
  'Collectibles',
  'Stake',
  'Swap',
  'Connections',
  'Identity',
]
export type Page = typeof pages[number]
