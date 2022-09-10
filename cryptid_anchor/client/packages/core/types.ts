export { ExtendedCluster } from './types/solana';
export { Wallet } from './types/crypto';
export type TransactionAccountMeta = { key: number, meta: number };
export type InstructionData = { data: Buffer; accounts: TransactionAccountMeta[]; programId: number }