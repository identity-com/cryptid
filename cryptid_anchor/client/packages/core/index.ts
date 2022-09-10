import { Builder } from './api/builder';
import { publicKeyToDid } from './lib/solana/util';
import { getCryptidAccountAddress } from './lib/cryptid';
export { ExtendedCluster } from './types/solana';
export { Cryptid } from './api/cryptid';
export { CRYPTID_PROGRAM } from './constants';

export const build = Builder.build;

export const util = {
    publicKeyToDid,
    getCryptidAccountAddress,
};

// Types exports
export * from './types';
