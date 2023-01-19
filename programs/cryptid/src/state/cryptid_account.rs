use crate::{error::CryptidError, id};
use anchor_lang::prelude::*;

/// The data for an on-chain Cryptid Account
#[account]
#[derive(Default)]
pub struct CryptidAccount {
    /// The middleware, if any, used by this cryptid account
    pub middleware: Option<Pubkey>,
    /// The index of this cryptid account - allows multiple cryptid accounts per DID
    pub index: u32,
    /// Middlewares that have "Superuser" status on the cryptid account
    pub superuser_middleware: Vec<Pubkey>,
}
impl CryptidAccount {
    pub const SEED_PREFIX: &'static [u8] = b"cryptid_account";

    pub const BASE_SIZE: usize = (1 + 32) + 4;
    pub fn calculate_size(superuser_middleware_count: usize) -> usize {
        Self::BASE_SIZE + 4 + (32 * superuser_middleware_count)
    }

    // Support generative and non-generative accounts
    pub fn try_from(
        cryptid_account: &AccountInfo,
        did_program: &Pubkey,
        did: &Pubkey,
        index: u32,
        cryptid_account_bump: u8,
    ) -> Result<CryptidAccount> {
        // Verify seed derivation
        let derived_cryptid_account =
            derive_cryptid_account_with_bump(did_program, did, index, cryptid_account_bump)?;
        if derived_cryptid_account != *cryptid_account.key {
            return Err(error!(CryptidError::WrongCryptidAccount));
        }

        if cryptid_account.owner == &System::id() {
            return Ok(CryptidAccount {
                middleware: None,
                index,
                superuser_middleware: vec![],
            });
        }

        // Non-generative account
        let cryptid_account: Account<CryptidAccount> = Account::try_from(cryptid_account)?;
        Ok(cryptid_account.into_inner())
    }
}

pub fn derive_cryptid_account_with_bump(
    did_program: &Pubkey,
    did: &Pubkey,
    index: u32,
    bump_seed: u8,
) -> Result<Pubkey> {
    Pubkey::create_program_address(
        &[
            CryptidAccount::SEED_PREFIX,
            did_program.key().as_ref(),
            did.key().as_ref(),
            index.to_le_bytes().as_ref(),
            &[bump_seed],
        ],
        &id(),
    )
    .map_err(|_| Error::from(ErrorCode::ConstraintSeeds))
}
