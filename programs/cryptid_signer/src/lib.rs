#![warn(unused_import_braces, missing_debug_implementations)]

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

pub const DOA_SIGNER_SEED: &str = "cryptid_signer";
pub const GENERATIVE_DOA_SEED: &str = "cryptid_doa";

#[derive(Debug)]
pub struct DOASignerSeeder {
    pub doa: Pubkey,
}
impl<'a> PDASeeder<'a> for DOASignerSeeder {
    type Iterator = IntoIter<&'a dyn PDASeed, 2>;

    fn seeds(&'a self) -> Self::Iterator {
        msg!("Seeds: [{}, {}]", DOA_SIGNER_SEED, self.doa);
        IntoIter::new([&DOA_SIGNER_SEED, &self.doa])
    }
}

#[derive(Debug)]
pub struct GenerativeDOASeeder {
    pub did_program: Pubkey,
    pub did: Pubkey,
}
impl<'a> PDASeeder<'a> for GenerativeDOASeeder {
    type Iterator = IntoIter<&'a dyn PDASeed, 3>;

    fn seeds(&'a self) -> Self::Iterator {
        IntoIter::new([&GENERATIVE_DOA_SEED, &self.did_program, &self.did])
    }
}
