use crate::state::cryptid_account::CryptidAccount;
use anchor_lang::prelude::Pubkey;
use std::fmt::Debug;

/// A set of seeds for a given PDA type.
pub trait PDASeeder: Debug {
    /// Gets a slice of seeds for this address.
    fn seeds(&self) -> Vec<Vec<u8>>;
}

/// The seeder for generative Cryptid Accounts
#[derive(Debug)]
pub struct CryptidSeeder {
    /// The DID program's key
    pub did_program: Pubkey,
    /// The DID's key
    pub did: Pubkey,
    /// The cryptid account index - allows multiple cryptid accounts per DID
    pub index: u32,
    /// The bump seed
    pub bump: u8,
}
impl PDASeeder for CryptidSeeder {
    fn seeds(&self) -> Vec<Vec<u8>> {
        [
            vec![
                CryptidAccount::SEED_PREFIX.to_vec(),
                self.did_program.to_bytes().to_vec(),
                self.did.to_bytes().to_vec(),
                self.index.to_le_bytes().to_vec(),
            ],
            vec![[self.bump].to_vec()],
        ]
        .concat()
    }
}
