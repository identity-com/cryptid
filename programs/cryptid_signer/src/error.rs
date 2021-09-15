use solana_generator::Error;

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
}
