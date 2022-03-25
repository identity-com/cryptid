//! The pda seeders for this program

use cruiser::pda_seeds::{PDASeed, PDASeeder};
use cruiser::Pubkey;
use std::boxed::Box;

/// The seed for the Cryptid signer
pub const CRYPTID_SIGNER_SEED: &str = "cryptid_signer";
/// The seed for generative Cryptid Accounts
pub const GENERATIVE_CRYPTID_SEED: &str = "cryptid_doa";
/// The seed for transaction accounts
pub const TRANSACTION_SEED: &str = "cryptid_transaction";

/// The seeder for cryptid signers
#[derive(Debug)]
pub struct CryptidSignerSeeder<'a> {
    /// The key of the cryptid account for this signer
    pub cryptid_account: &'a Pubkey,
}
impl<'b> PDASeeder for CryptidSignerSeeder<'b> {
    fn seeds<'a>(&'a self) -> Box<dyn Iterator<Item = &'a dyn PDASeed> + 'a> {
        Box::new([&CRYPTID_SIGNER_SEED as &dyn PDASeed, self.cryptid_account].into_iter())
    }
}

/// The seeder for generative Cryptid Accounts
#[derive(Debug)]
pub struct GenerativeCryptidSeeder<'a> {
    /// The DID program's key
    pub did_program: &'a Pubkey,
    /// The DID's key
    pub did: &'a Pubkey,
}
impl<'b> PDASeeder for GenerativeCryptidSeeder<'b> {
    fn seeds<'a>(&'a self) -> Box<dyn Iterator<Item = &'a dyn PDASeed> + 'a> {
        Box::new(
            [
                &GENERATIVE_CRYPTID_SEED as &dyn PDASeed,
                self.did_program,
                self.did,
            ]
            .into_iter(),
        )
    }
}
