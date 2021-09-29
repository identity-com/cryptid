use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use solana_generator::{Account, AccountArgument, InitAccount, ProgramAccount, ZeroedAccount};
use solana_program::pubkey::Pubkey;

#[derive(AccountArgument)]
pub struct EmptyStruct {}

#[derive(AccountArgument)]
pub struct EmptyTupple();

#[derive(AccountArgument)]
pub struct Empty;

#[derive(AccountArgument)]
#[account_argument(instruction_data = init_size: u64)]
pub struct FullStruct {
    data_account: ProgramAccount<CoolAccount>,
    #[account_argument(instruction_data = vec![(); init_size as usize])]
    init_accounts: Vec<InitAccount<CoolAccount>>,
    #[account_argument(signer, writable(3), owner(0..4) = get_pubkey())]
    other_accounts: [ZeroedAccount<i8>; 8],
}

#[derive(AccountArgument)]
#[account_argument(instruction_data = (init_size: u64))]
pub struct FullStruct2 {
    data_account: ProgramAccount<CoolAccount>,
    #[account_argument(instruction_data = vec![(); init_size as usize])]
    init_accounts: Vec<InitAccount<CoolAccount>>,
    #[account_argument(signer, writable(3), owner(0..4) = get_pubkey())]
    other_accounts: [ZeroedAccount<i8>; 8],
}

#[derive(Default, Account, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct CoolAccount {
    data_1: u64,
    cool_data: [u8; 32],
}

fn get_pubkey() -> Pubkey {
    Pubkey::new_unique()
}
