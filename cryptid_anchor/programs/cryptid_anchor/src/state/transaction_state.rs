use anchor_lang::prelude::*;

/// A [`TransactionAccount`]'s state
#[derive(Clone, Debug, AnchorDeserialize, AnchorSerialize, PartialEq)]
pub enum TransactionState {
    /// Transaction account is not ready to execute - it is waiting for additional instructions to be added
    NotReady,
    /// Transaction account is ready to execute
    Ready,
    /// Transaction account has executed
    Executed,
}
impl TransactionState {
    /// Calculates the on-chain size of a [`TransactionState`]
    pub const fn calculate_size() -> usize {
        1 //enum
    }
}
impl Default for TransactionState {
    fn default() -> Self {
        Self::NotReady
    }
}
