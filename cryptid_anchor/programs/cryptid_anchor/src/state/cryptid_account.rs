//! The types that are stored in accounts for `cryptid_signer`

use bitflags::bitflags;
use std::collections::HashMap;
use anchor_lang::prelude::{*, AccountMeta as SolanaAccountMeta};
use anchor_lang::solana_program::clock::UnixTimestamp;
use crate::error::CryptidSignerError;

/// The data for an on-chain Cryptid Account
#[account]
pub struct CryptidAccount {
    /// The DID for this
    pub did: Pubkey,
    /// The program for the DID
    pub did_program: Pubkey,
    /// The nonce of the Cryptid Signer
    pub signer_nonce: u8,
    /// The number of keys needed for transactions to be executed
    pub key_threshold: u8,
    /// A tracker to invalidate transactions when settings change
    pub settings_sequence: u16,
    // TODO: Implement when permissions added
    // pub sign_permissions: ?,
    // pub execute_permissions: ?,
    // pub remove_permissions: ?,
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
        require_keys_eq!(self.did, did, CryptidSignerError::WrongDID);
        require_keys_eq!(self.did_program, did_program, CryptidSignerError::WrongDIDProgram);
        Ok(())
    }
}

