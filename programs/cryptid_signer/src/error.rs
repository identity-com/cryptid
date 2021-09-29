//! Error types for `cryptid_signer`

use solana_generator::solana_program::program_error::ProgramError;
use solana_generator::{Error, Pubkey};

/// The main error type for `cryptid_signer`.
/// Start index is `700`
#[derive(Debug, Error)]
#[error(start = 700)]
pub enum CryptidSignerError {
    /// Not enough signers were passed
    #[error_msg("Not enough signers, expected `{}`, received `{}", expected, received)]
    NotEnoughSigners {
        /// Amount of signers expected
        expected: u8,
        /// Amount of signers received
        received: u8,
    },
    /// Wrong DID was passed
    #[error_msg("Wrong did, expected `{}`, received `{}`", expected, received)]
    WrongDID {
        /// The DID that was expected
        expected: Pubkey,
        /// The DID that was received
        received: Pubkey,
    },
    /// Wrong DID Program passed
    #[error_msg("Wrong did program, expected `{}`, received `{}`", expected, received)]
    WrongDIDProgram {
        /// The DID Program that was expected
        expected: Pubkey,
        /// The DID Program that was received
        received: Pubkey,
    },
    /// Sub-instruction threw an error
    #[error_msg("Error in sub-instruction `{}`, error: `{}`", index, error)]
    SubInstructionError {
        /// The index of the instruction that errored
        index: usize,
        /// The error the instruction gave
        error: ProgramError,
    },
}
