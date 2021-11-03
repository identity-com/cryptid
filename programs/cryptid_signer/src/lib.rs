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
/// The seed for transaction accounts
pub const TRANSACTION_SEED: &str = "cryptid_transaction";

/// The seeder for cryptid signers
#[derive(Debug)]
pub struct CryptidSignerSeeder {
    /// The key of the cryptid account for this signer
    pub cryptid_account: Pubkey,
}
impl PDASeeder for CryptidSignerSeeder {
    fn seeds<'a>(&'a self) -> Box<dyn Iterator<Item = &'a dyn PDASeed> + 'a> {
        Box::new(IntoIter::new([
            &CRYPTID_SIGNER_SEED as &dyn PDASeed,
            &self.cryptid_account,
        ]))
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
impl PDASeeder for GenerativeCryptidSeeder {
    fn seeds<'a>(&'a self) -> Box<dyn Iterator<Item = &'a dyn PDASeed> + 'a> {
        Box::new(IntoIter::new([
            &GENERATIVE_CRYPTID_SEED as &dyn PDASeed,
            &self.did_program,
            &self.did,
        ]))
    }
}

/// The seeder for transaction accounts
#[derive(Debug)]
pub struct TransactionSeeder {
    /// The cryptid account for this transaction
    pub cryptid_account: Pubkey,
    /// The seed/name of this transaction
    pub seed: String,
}
impl PDASeeder for TransactionSeeder {
    fn seeds<'a>(&'a self) -> Box<dyn Iterator<Item = &'a dyn PDASeed> + 'a> {
        Box::new(IntoIter::new([
            &TRANSACTION_SEED as &dyn PDASeed,
            &self.cryptid_account,
            &self.seed,
        ]))
    }
}
