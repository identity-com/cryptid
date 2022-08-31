//! Error types for `cryptid_signer`

use anchor_lang::prelude::*;

/// The main error type for `cryptid_signer`.
#[error_code]
pub enum CryptidError {
    /// Not enough signers were passed
    #[msg("Not enough signers")]
    NotEnoughSigners,
    /// Wrong DID was passed
    #[msg("Wrong DID")]
    WrongDID,
    /// Wrong DID Program passed
    #[msg("Wrong DID program")]
    WrongDIDProgram,
    /// Sub-instruction threw an error
    #[msg("Error in sub-instruction")]
    SubInstructionError,
    /// Invalid transaction state
    #[msg("Invalid transaction state")]
    InvalidTransactionState,
    /// Key is not a proposer for the transaction
    #[msg("Key is not a proposer for the transaction")]
    KeyCannotChangeTransaction,
    /// Signer is not authorised to sign for this Cryptid account
    #[msg(
        "Signer is not authorised to sign for this Cryptid account"
    )]
    KeyMustBeSigner,
    /// Indexer went out of possible range
    #[msg("Index out of range.")]
    IndexOutOfRange,
    /// An attempt to make a PDA from a set of seeds failed
    #[msg("No account from seeds.")]
    NoAccountFromSeeds,
    /// Error validating a PDA from a set of seeds
    #[msg("Account not from seeds.")]
    AccountNotFromSeeds
}
