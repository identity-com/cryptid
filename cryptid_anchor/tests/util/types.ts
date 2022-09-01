// TODO how to extract these from the anchor idl?
export type TransactionAccountMeta = { key: number, meta: number };
export type InstructionData = { data: Buffer; accounts: TransactionAccountMeta[]; programId: number }