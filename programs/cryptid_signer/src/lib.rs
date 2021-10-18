#![warn(unused_import_braces, missing_debug_implementations, missing_docs)]
//! A signer that supports did-interfaces for signing (rotatable multi-key)

use solana_generator::*;

use crate::instruction::CryptidInstruction;
use std::array::IntoIter;

#[macro_use]
mod macros;

pub mod account;
pub mod error;
pub mod instruction;
pub mod state;

#[cfg(not(feature = "no-entrypoint"))]
entrypoint_list!(CryptidInstruction);

/// The seed for the Cryptid signer
pub const CRYPTID_SIGNER_SEED: &str = "cryptid_signer";
/// The seed for generative Cryptid Accounts
pub const GENERATIVE_CRYPTID_SEED: &str = "cryptid_doa";

/// The seeder for cryptid signers
#[derive(Debug)]
pub struct CryptidSignerSeeder {
    /// The key of the cryptid account for this signer
    pub cryptid_account: Pubkey,
}
impl<'a> PDASeeder<'a> for CryptidSignerSeeder {
    type Iterator = IntoIter<&'a dyn PDASeed, 2>;

    fn seeds(&'a self) -> Self::Iterator {
        IntoIter::new([&CRYPTID_SIGNER_SEED, &self.cryptid_account])
    }
}

/// The seeder for generative Cryptid Accounts
#[derive(Debug)]
pub struct GenerativeCryptidSeeder {
    /// The DID program's key
    pub did_program: Pubkey,
    /// The DID's key
    pub did: Pubkey,
}
impl<'a> PDASeeder<'a> for GenerativeCryptidSeeder {
    type Iterator = IntoIter<&'a dyn PDASeed, 3>;

    fn seeds(&'a self) -> Self::Iterator {
        IntoIter::new([&GENERATIVE_CRYPTID_SEED, &self.did_program, &self.did])
    }
}
