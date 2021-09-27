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

/// The seed for the DOA signer
pub const DOA_SIGNER_SEED: &str = "cryptid_signer";
/// The seed for generative DOAs
pub const GENERATIVE_DOA_SEED: &str = "cryptid_doa";

/// The seeder for DOA signers
#[derive(Debug)]
pub struct DOASignerSeeder {
    /// The key of the doa for this signer
    pub doa: Pubkey,
}
impl<'a> PDASeeder<'a> for DOASignerSeeder {
    type Iterator = IntoIter<&'a dyn PDASeed, 2>;

    fn seeds(&'a self) -> Self::Iterator {
        msg!("Seeds: [{}, {}]", DOA_SIGNER_SEED, self.doa);
        IntoIter::new([&DOA_SIGNER_SEED, &self.doa])
    }
}

/// The seeder for generative DOAs
#[derive(Debug)]
pub struct GenerativeDOASeeder {
    /// The DID program's key for this DOA
    pub did_program: Pubkey,
    /// The DID's key for this DOA
    pub did: Pubkey,
}
impl<'a> PDASeeder<'a> for GenerativeDOASeeder {
    type Iterator = IntoIter<&'a dyn PDASeed, 3>;

    fn seeds(&'a self) -> Self::Iterator {
        IntoIter::new([&GENERATIVE_DOA_SEED, &self.did_program, &self.did])
    }
}
