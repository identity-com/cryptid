use crate::solana_program::pubkey::PubkeyError;
use crate::{GeneratorError, GeneratorResult, Pubkey};
use std::fmt::Debug;

/// A possible seed to a PDA.
pub trait PDASeed: AsRef<[u8]> {
    /// Turns the seed into a human readable string.
    fn to_seed_string(&self) -> String;
}
impl PDASeed for Pubkey {
    fn to_seed_string(&self) -> String {
        format!("{}", self)
    }
}
impl PDASeed for &str {
    fn to_seed_string(&self) -> String {
        String::from(*self)
    }
}
impl PDASeed for &[u8] {
    fn to_seed_string(&self) -> String {
        format!("{:?}", self)
    }
}

/// A set of seeds for a given PDA type.
pub trait PDASeeder<'a> {
    /// The iterator [`PDASeeder::seeds`] returns.
    type Iterator: Iterator<Item = &'a dyn PDASeed> + 'a;

    /// Gets an iterator of seeds for this address.
    fn seeds(&'a self) -> Self::Iterator;
}

/// Generates a PDA from a given seeder.
#[derive(Debug)]
pub struct PDAGenerator<T>
where
    for<'a> T: PDASeeder<'a>,
{
    program_id: Pubkey,
    seeds: T,
}
impl<T> PDAGenerator<T>
where
    for<'a> T: PDASeeder<'a>,
{
    /// Creates a new generator
    pub fn new(program_id: Pubkey, seeds: T) -> Self {
        Self { program_id, seeds }
    }

    /// Gets the seeds as a vector of bytes withan optional nonce
    pub fn seeds_to_bytes<'a>(&'a self, nonce: Option<&'a [u8; 1]>) -> Vec<&'a [u8]> {
        self.seeds
            .seeds()
            .map(|seed| seed.as_ref())
            .chain(nonce.into_iter().map(AsRef::as_ref))
            .collect::<Vec<_>>()
    }

    /// Gets the seeds as a vector of stings with an optional nonce
    pub fn seeds_to_strings(&self, nonce: Option<u8>) -> Vec<String> {
        self.seeds
            .seeds()
            .map(|seed: &dyn PDASeed| seed.to_seed_string())
            .chain(nonce.iter().map(u8::to_string))
            .collect()
    }

    /// Finds an address for the given seeds returning `(key, nonce)`
    pub fn find_address(&self) -> (Pubkey, u8) {
        let seed_bytes = self.seeds_to_bytes(None);
        Pubkey::find_program_address(&seed_bytes, &self.program_id)
    }

    /// Creates an address from given seeds and nonce, ~50% chance to error if given a random nonce
    pub fn create_address(&self, nonce: u8) -> GeneratorResult<Pubkey> {
        let nonce_array = [nonce];
        match Pubkey::create_program_address(
            &self.seeds_to_bytes(Some(&nonce_array)),
            &self.program_id,
        ) {
            Ok(key) => Ok(key),
            Err(error) => match error {
                PubkeyError::InvalidSeeds => Err(GeneratorError::NoAccountFromSeeds {
                    seeds: self.seeds_to_strings(Some(nonce)),
                }
                .into()),
                error => Err(error.into()),
            },
        }
    }

    /// Verifies that a given address is derived from given seeds. Returns the found nonce.
    pub fn verify_address_without_nonce(&self, address: Pubkey) -> GeneratorResult<u8> {
        let (key, nonce) = self.find_address();
        if address != key {
            return Err(GeneratorError::AccountNotFromSeeds {
                account: address,
                seeds: self.seeds_to_strings(None),
                program_id: self.program_id,
            }
            .into());
        }
        Ok(nonce)
    }

    /// Verifies that a given address is derived from given seeds and nonce.
    pub fn verify_address_with_nonce(&self, address: Pubkey, nonce: u8) -> GeneratorResult<()> {
        let created_key = self.create_address(nonce);
        if created_key.is_err() || address != created_key? {
            return Err(GeneratorError::AccountNotFromSeeds {
                account: address,
                seeds: self.seeds_to_strings(Some(nonce)),
                program_id: self.program_id,
            }
            .into());
        }
        Ok(())
    }

    /// Verifies that a given address is derived from given seeds and optional nonce. Will return nonce if none given.
    pub fn verify_address(
        &self,
        address: Pubkey,
        nonce: Option<u8>,
    ) -> GeneratorResult<Option<u8>> {
        match nonce {
            None => {
                let nonce = self.verify_address_without_nonce(address)?;
                Ok(Some(nonce))
            }
            Some(nonce) => {
                self.verify_address_with_nonce(address, nonce)?;
                Ok(None)
            }
        }
    }
}
