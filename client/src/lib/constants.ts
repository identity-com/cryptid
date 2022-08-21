import { PublicKey } from '@solana/web3.js';
import { ExtendedCluster } from '../types/solana';

export const SOL_DID_PROGRAM_ID = new PublicKey(
  'didso1Dpqpm4CsiCjzP766BGY89CAdD6ZBL68cRhFPc'
);

export const CRYPTID_PROGRAM_ID =
  process.env.STAGE === 'dev'
    ? new PublicKey('tcrjc6mfci8bQLmXPfrVw9fJm9Y5tr268tByjSQmSe9')
    : new PublicKey('crypt1GWL27FYSg7gEfJVzbc8KzEcTToFNmaXi9ropg');

export const DEFAULT_CLUSTER: ExtendedCluster = 'mainnet-beta';

export const DEFAULT_DID_DOCUMENT_SIZE = 1_500;
