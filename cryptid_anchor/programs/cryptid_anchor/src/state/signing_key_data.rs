use anchor_lang::prelude::*;

/// The on-chain format of [`SigningKey`]
#[derive(Clone, Debug, AnchorDeserialize, AnchorSerialize, PartialEq)]
pub struct SigningKeyData {
    /// The signing key
    pub key: Pubkey,
    /// Extra keys needed for signing
    pub extra_keys: Vec<Pubkey>,
}
impl SigningKeyData {
    /// Calculates the on-chain size of a [`SigningKeyData`]
    pub const fn calculate_size(num_extras: usize) -> usize {
        32 //key
            + 4 + 32 * num_extras //extra_keys
    }
}