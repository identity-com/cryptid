use solana_generator::solana_program::program_error::ProgramError;
use solana_generator::{Error, Pubkey};

#[derive(Debug, Error)]
pub enum CryptidSignerError {
    #[error_msg("Not enough signers, expected `{}`, received `{}", expected, received)]
    NotEnoughSigners { expected: u8, received: u8 },
    #[error_msg("Wrong did, expected `{}`, received `{}`", expected, received)]
    WrongDID { expected: Pubkey, received: Pubkey },
    #[error_msg("Wrong did program, expected `{}`, received `{}`", expected, received)]
    WrongDIDProgram { expected: Pubkey, received: Pubkey },
    #[error_msg("Error in sub-instruction `{}`, error: `{}`", index, error)]
    SubInstructionError { index: usize, error: ProgramError },
}
