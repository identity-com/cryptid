import { Builder } from './api/builder';
import {getCryptidAccountAddress, getCryptidAccountAddressFromDID} from './lib/cryptid';
export { ExtendedCluster } from './types/solana';
export { Cryptid } from './api/cryptid';
export { CRYPTID_PROGRAM } from './constants';

export const build = Builder.buildFromDID;

export const util = {
    getCryptidAccountAddress,
    getCryptidAccountAddressFromDID
};

// Types exports
export * from './types';
