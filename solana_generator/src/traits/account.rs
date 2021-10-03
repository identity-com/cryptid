use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
pub use solana_generator_derive::Account;
use solana_program::pubkey::Pubkey;
use std::borrow::Cow;
use std::io::Write;
use std::ops::Deref;

/// The type of account discriminants
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AccountDiscriminant<'a>(pub Cow<'a, [u8]>);
impl<'a> BorshSerialize for AccountDiscriminant<'a> {
    fn serialize<W: Write>(&self, writer: &mut W) -> borsh::maybestd::io::Result<()> {
        if self.0.len() > u8::MAX as usize {
            panic!("Discriminant longer than `{}`", u8::MAX);
        }
        writer.write_all(&[self.0.len() as u8])?;
        writer.write_all(self.0.deref())
    }
}
impl<'a> BorshDeserialize for AccountDiscriminant<'a> {
    fn deserialize(buf: &mut &[u8]) -> borsh::maybestd::io::Result<Self> {
        let len = buf[0] as usize;
        *buf = &buf[1..];
        let out = Self(Cow::Owned(buf[..len].to_owned()));
        *buf = &buf[len..];
        Ok(out)
    }
}
impl AccountDiscriminant<'static> {
    /// Creates a discriminant from a static array
    pub const fn from_array<const N: usize>(from: &'static [u8; N]) -> Self {
        Self(Cow::Borrowed(from))
    }
}

/// Data that can be stored within an account
pub trait Account: BorshSerialize + BorshDeserialize + BorshSchema {
    /// The discriminant for this account.
    /// A given discriminant should not be duplicated or your program will be open to a confusion attack.
    /// All Discriminants of the form `[255, ..]` are reserved for system implementations.
    const DISCRIMINANT: AccountDiscriminant<'static>;
}
macro_rules! impl_account {
    ($ty:ty, $expr:expr) => {
        impl Account for $ty {
            const DISCRIMINANT: AccountDiscriminant<'static> =
                AccountDiscriminant::from_array($expr);
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
