use crate::error::CryptidSignerError;
use bitflags::bitflags;
use std::collections::HashMap;
use anchor_lang::prelude::{*, AccountMeta as SolanaAccountMeta};
use anchor_lang::solana_program::clock::UnixTimestamp;
use crate::ProgramError;

bitflags! {
    /// The meta information about an instruction account
    #[derive(AnchorDeserialize, AnchorSerialize)]
    pub struct AccountMetaProps: u8{
        /// The account is a signer
        const IS_SIGNER = 1 << 0;
        /// The account is writable
        const IS_WRITABLE = 1 << 1;
    }
}
impl AccountMetaProps {
    /// Calculates the on-chain size of a [`AccountMeta`]
    pub const fn calculate_size() -> usize {
        1 //u8 size
    }

    /// Creates a new [`AccountMetaProps`] from the given arguments
    pub fn new(is_signer: bool, is_writable: bool) -> Self {
        Self::from_bits(
            ((is_signer as u8) * Self::IS_SIGNER.bits)
                | ((is_writable as u8) * Self::IS_WRITABLE.bits),
        )
            .unwrap()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use std::iter::once;

    #[test]
    fn account_meta_from_bools() {
        assert_eq!(AccountMetaProps::new(false, false), AccountMetaProps::empty());
        assert_eq!(AccountMetaProps::new(true, false), AccountMetaProps::IS_SIGNER);
        assert_eq!(AccountMetaProps::new(false, true), AccountMetaProps::IS_WRITABLE);
        assert_eq!(AccountMetaProps::new(true, true), AccountMetaProps::all());
    }
}
