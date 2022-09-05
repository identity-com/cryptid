use anchor_lang::prelude::Pubkey;
use std::fmt::Debug;

/// The seed for the Cryptid signer
pub const CRYPTID_SIGNER_SEED: &[u8; 14] = br"cryptid_signer";
/// The seed for generative Cryptid Accounts
pub const GENERATIVE_CRYPTID_SEED: &[u8; 15] = br"cryptid_account";
/// The seed for transaction accounts
pub const TRANSACTION_SEED: &[u8; 19] = br"cryptid_transaction";

/// A set of seeds for a given PDA type.
pub trait PDASeeder: Debug {
    /// Gets a slice of seeds for this address.
    fn seeds(&self) -> Vec<Vec<u8>>;
}

/// The seeder for cryptid signers
#[derive(Debug)]
pub struct CryptidSignerSeeder {
    /// The key of the cryptid account for this signer
    pub cryptid_account: Pubkey,
}
impl PDASeeder for CryptidSignerSeeder {
    fn seeds(&self) -> Vec<Vec<u8>> {
        vec![
            CRYPTID_SIGNER_SEED.to_vec(),
            self.cryptid_account.to_bytes().to_vec(),
        ]
    }
}

/// The seeder for generative Cryptid Accounts
#[derive(Debug)]
pub struct GenerativeCryptidSeeder {
    /// The DID program's key
    pub did_program: Pubkey,
    /// The DID's key
    pub did: Pubkey,
    /// Any additional seeds, e.g. for obligatory middleware
    pub additional_seeds: Vec<Vec<u8>>,
    /// The bump seed
    pub bump: u8,
}
impl PDASeeder for GenerativeCryptidSeeder {
    fn seeds(&self) -> Vec<Vec<u8>> {
        [
            vec![
                GENERATIVE_CRYPTID_SEED.to_vec(),
                self.did_program.to_bytes().to_vec(),
                self.did.to_bytes().to_vec(),
            ],
            self.additional_seeds.to_owned(),
            vec![[self.bump].to_vec()],
        ]
        .concat()
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
    fn seeds(&self) -> Vec<Vec<u8>> {
        vec![
            TRANSACTION_SEED.to_vec(),
            self.cryptid_account.to_bytes().to_vec(),
            self.seed.as_bytes().to_vec(),
        ]
    }
}
