import { publicKeyToDid } from './lib/util';

import { Builder } from './api/builder';
export { ExtendedCluster } from "./types/solana";
export { Cryptid } from './api/cryptid';

export const build = Builder.build;

export const util = {
  publicKeyToDid,
};
