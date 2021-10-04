use crate::msg;
use crate::solana_program::pubkey::PubkeyError;
pub use solana_generator_derive::Error;
use solana_program::program_error::ProgramError;
use std::fmt::Debug;

/// A version of [`Result`] returned by many [`solana_generator`] functions.
pub type GeneratorResult<T = ()> = Result<T, Box<dyn Error>>;

/// An error that can be returned on the chain
pub trait Error: Debug {
    /// The message the error represents
    fn message(&self) -> String;
    /// Turns this into a returnable error
    fn to_program_error(&self) -> ProgramError;
}

impl Error for ProgramError {
    fn message(&self) -> String {
        format!("{}", self)
    }

    fn to_program_error(&self) -> ProgramError {
        self.clone()
    }
}
impl<T> From<T> for Box<dyn Error>
where
    T: Error + 'static,
{
    fn from(from: T) -> Self {
        Box::new(from)
    }
}
impl From<std::io::Error> for Box<dyn Error> {
    fn from(from: std::io::Error) -> Self {
        ProgramError::from(from).into()
    }
}
impl From<PubkeyError> for Box<dyn Error> {
    fn from(from: PubkeyError) -> Self {
        match from {
            PubkeyError::MaxSeedLengthExceeded => msg!("PubkeyError::MaxSeedLengthExceeded"),
            PubkeyError::InvalidSeeds => msg!("PubkeyError::InvalidSeeds"),
            PubkeyError::IllegalOwner => msg!("PubkeyError::IllegalOwner"),
        };
        ProgramError::InvalidSeeds.into()
    }
}
