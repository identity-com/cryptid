import { PublicKey } from '@solana/web3.js';
import { ExtendedCluster } from '../types/solana';

export const DOA_PROGRAM_ID = new PublicKey(
  'CFE6uDuLK7Hd9HVQqWkXU3nTmdZUm5KCEtFcEfbSTZLy'
); // TODO @brett
export const DEFAULT_CLUSTER: ExtendedCluster = 'mainnet-beta';
