use bitflags::bitflags;
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use solana_generator::UnixTimestamp;
use solana_generator::{Account, Pubkey};

#[derive(Debug, Default, Account, BorshSerialize, BorshDeserialize, BorshSchema)]
#[account(discriminant = [1])]
pub struct DOAAccount {
    pub did: Pubkey,
    pub signer_nonce: u8,
    pub key_threshold: u8,
    pub settings_sequence: u16,
    // pub sign_permissions: ?,
    // pub execute_permissions: ?,
    // pub remove_permissions: ?,
}

#[derive(Debug, Default, Account, BorshSerialize, BorshDeserialize, BorshSchema)]
#[account(discriminant = [2])]
pub struct TransactionAccount {
    pub doa: Pubkey,
    pub transaction_instructions: Vec<InstructionData>,
    pub signers: Vec<(Pubkey, UnixTimestamp)>,
    pub has_executed: bool,
    pub settings_sequence: u16,
}

#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct InstructionData {
    pub program_id: Pubkey,
    pub accounts: Vec<TransactionAccountMeta>,
    pub data: Vec<u8>,
}

#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct TransactionAccountMeta {
    pub key: Pubkey,
    pub meta: AccountMeta,
}

bitflags! {
    #[derive(BorshSerialize, BorshDeserialize, BorshSchema)]
    pub struct AccountMeta: u8{
        const IS_SIGNER = 1 << 0;
        const IS_WRITABLE = 1 << 1;
    }
}
