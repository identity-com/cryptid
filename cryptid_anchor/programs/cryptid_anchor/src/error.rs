//! Error types for `cryptid_signer`

use anchor_lang::prelude::*;
use crate::state::signing_key_data::SigningKeyData;
use crate::state::transaction_account::TransactionState;

/// The main error type for `cryptid_signer`.
#[error_code]
pub enum CryptidSignerError {
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
    /// Non-signing key marked as a signer
    #[msg(
        "A key was passed as a SigningKey but is not a signer of the transaction"
    )]
    KeyMustBeSigner,
    /// Indexer went out of possible range
    #[msg("Index out of range.")]
    IndexOutOfRange,
}
