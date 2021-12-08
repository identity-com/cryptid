import { PublicKey } from '@solana/web3.js';
import { ExtendedCluster } from '../types/solana';

export const SOL_DID_PROGRAM_ID = new PublicKey(
  'idDa4XeCjVwKcprVAo812coUQbovSZ4kDGJf2sPaBnM'
);

export const DOA_PROGRAM_ID =
  process.env.STAGE === 'dev'
    ? new PublicKey('tcrjc6mfci8bQLmXPfrVw9fJm9Y5tr268tByjSQmSe9')
    : new PublicKey('CFE6uDuLK7Hd9HVQqWkXU3nTmdZUm5KCEtFcEfbSTZLy');

export const DEFAULT_CLUSTER: ExtendedCluster = 'mainnet-beta';

export const DEFAULT_DID_DOCUMENT_SIZE = 1_500;
