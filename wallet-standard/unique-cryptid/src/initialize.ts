import { registerWallet } from './register.js';
import { UniqueCryptidWallet } from './wallet.js';
import type { UniqueCryptid } from './window.js';

export function initialize(uniqueCryptid: UniqueCryptid): void {
    registerWallet(new UniqueCryptidWallet(uniqueCryptid));
}
