use solana_generator::{Error, Pubkey};

#[derive(Debug, Error)]
pub enum CryptIdSignerError {
    #[error_msg(
        "`expiry_times` size (`{}`) does not match `signers` size (`{}`)",
        expiry_times_size,
        signers_size
    )]
    ExpiryTimesSizeMismatch {
        expiry_times_size: usize,
        signers_size: usize,
    },
    #[error_msg("Not enough signers, expected `{}`, received `{}", expected, received)]
    NotEnoughSigners { expected: u8, received: u8 },
    #[error_msg("Wrong did, expected `{}`, received `{}`", expected, received)]
    WrongDID { expected: Pubkey, received: Pubkey },
    #[error_msg("Wrong did program, expected `{}`, received `{}`", expected, received)]
    WrongDIDProgram { expected: Pubkey, received: Pubkey },
}
