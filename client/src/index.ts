import { Builder } from './api/builder';
import { publicKeyToDid } from './lib/solana/util';
import { didToDefaultDOASigner } from './lib/util';
export { ExtendedCluster } from './types/solana';
export { Cryptid } from './api/cryptid';
export { JsonSerializedTransaction } from './lib/serialize';
import { jsonDeserialize, jsonSerialize } from './lib/serialize';

export const build = Builder.build;

export const util = {
  publicKeyToDid,
  didToDefaultDOASigner,
  jsonDeserialize,
  jsonSerialize,
};

// Types exports
export * from './types';
