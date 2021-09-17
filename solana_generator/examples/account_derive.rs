use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use solana_generator::Account;

#[derive(BorshSchema, BorshSerialize, BorshDeserialize)]
pub struct Cool(String);

#[derive(Account, BorshSchema, BorshSerialize, BorshDeserialize)]
#[account(discriminant = [1; 4])]
pub struct AccountTest {
    pub data: u8,
    pub cool: Cool,
    pub stuff: u64,
}
