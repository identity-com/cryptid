//! The types that are stored in accounts for `cryptid_signer`

use anchor_lang::prelude::*;
use crate::error::CryptidError;

/// The data for an on-chain Cryptid Account - TODO Temp until fixed - wi
#[account]
pub struct CryptidAccount {
    /// The DID for this account
    pub did: Pubkey,
    /// The program for the DID
    pub did_program: Pubkey,
    /// The middleware, if any, used by this cryptid account
    pub middleware: Option<Pubkey>,
}
impl CryptidAccount {
    /// The value for [`CryptidAccount::key_threshold`] on a generative cryptid account
    pub const GENERATIVE_CRYPTID_KEY_THRESHOLD: u8 = 1;

    /// The [`CryptidAccount::settings_sequence`] value when the cryptid account is locked
    pub const LOCKED_CRYPTID_SETTINGS_SEQUENCE: u16 = 0;
    /// The [`CryptidAccount::settings_sequence`] value when the cryptid account is generative
    pub const GENERATIVE_CRYPTID_SETTINGS_SEQUENCE: u16 = 1;
    /// The [`CryptidAccount::settings_sequence`] start value
    pub const SETTINGS_SEQUENCE_START: u16 = 2;

    /// Verifies that this Cryptid Account comes from the DID and DID Program
    pub fn verify_did_and_program(&self, did: Pubkey, did_program: Pubkey) -> Result<()> {
        require_keys_eq!(self.did, did, CryptidError::WrongDID);
        require_keys_eq!(self.did_program, did_program, CryptidError::WrongDIDProgram);
        Ok(())
    }
}

