export { CryptidBuilder as Cryptid } from './api/cryptidBuilder';
import {getCryptidAccountAddress, getCryptidAccountAddressFromDID} from './lib/cryptid';
export type { CryptidClient, CryptidOptions } from './api/cryptidClient';
export { MiddlewareRegistry } from './service/middlewareRegistry';
export { CRYPTID_PROGRAM } from './constants';

export const util = {
    getCryptidAccountAddress,
    getCryptidAccountAddressFromDID
};

// Types exports
export * from './types';
