use crate::discriminant::Discriminant;
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
pub use solana_generator_derive::Account;
use solana_program::pubkey::Pubkey;

/// Data that can be stored within an account
pub trait Account: BorshSerialize + BorshDeserialize + BorshSchema {
    /// The discriminant for this account.
    /// A given discriminant should not be duplicated or your program will be open to a confusion attack.
    /// All Discriminants of the form `[255, ..]` are reserved for system implementations.
    const DISCRIMINANT: Discriminant<'static>;
}
macro_rules! impl_account {
    ($ty:ty, $expr:expr) => {
        impl Account for $ty {
            const DISCRIMINANT: Discriminant<'static> = Discriminant::from_array($expr);
        }
    };
}

impl_account!(u8, &[255, 0]);
impl_account!(u16, &[255, 1]);
impl_account!(u32, &[255, 2]);
impl_account!(u64, &[255, 3]);
impl_account!(u128, &[255, 4]);
impl_account!(i8, &[255, 5]);
impl_account!(i16, &[255, 6]);
impl_account!(i32, &[255, 7]);
impl_account!(i64, &[255, 8]);
impl_account!(i128, &[255, 9]);
impl_account!(String, &[255, 10]);
impl_account!(Pubkey, &[255, 11]);
impl_account!(Vec<u8>, &[255, 12]);
