use std::fmt::Debug;
use anchor_lang::prelude::Pubkey;

/// The seed for the Cryptid signer
pub const CRYPTID_SIGNER_SEED: &[u8; 14] = br"cryptid_signer";
/// The seed for generative Cryptid Accounts
pub const GENERATIVE_CRYPTID_SEED: &[u8; 15] = br"cryptid_account";
/// The seed for transaction accounts
pub const TRANSACTION_SEED: &[u8; 19] = br"cryptid_transaction";


/// A set of seeds for a given PDA type.
pub trait PDASeeder: Debug {
    /// Gets a slice of seeds for this address.
    fn seeds(&self) -> Vec<u8>;
}

/// The seeder for cryptid signers
#[derive(Debug)]
pub struct CryptidSignerSeeder {
    /// The key of the cryptid account for this signer
    pub cryptid_account: Pubkey,
}
impl PDASeeder for CryptidSignerSeeder {
    fn seeds(&self) -> Vec<u8> {
        [CRYPTID_SIGNER_SEED as &[u8], &self.cryptid_account.to_bytes()].concat()
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
    fn seeds(&self) -> Vec<u8> {
        [
            GENERATIVE_CRYPTID_SEED as &[u8],
            &self.did_program.clone().to_bytes(),
            &self.did.to_bytes(),
        ].concat()
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
    fn seeds<'a>(&'a self) -> Vec<u8> {
        [
            TRANSACTION_SEED as &[u8],
            &self.cryptid_account.to_bytes(),
            &self.seed.as_bytes(),
        ].concat()
    }
}
