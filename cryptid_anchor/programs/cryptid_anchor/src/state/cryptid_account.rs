use anchor_lang::prelude::*;

/// The data for an on-chain Cryptid Account
#[account]
pub struct CryptidAccount {
    /// The middleware, if any, used by this cryptid account
    pub middleware: Option<Pubkey>,
    /// The index of this cryptid account - allows multiple cryptid accounts per DID
    pub index: u32,
}
impl CryptidAccount {
    pub const SEED_PREFIX: &'static [u8] = b"cryptid_account";

    pub const MAX_SIZE: usize = (1 + 32) + 4;
}
