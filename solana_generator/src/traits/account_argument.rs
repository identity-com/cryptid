use solana_program::pubkey::Pubkey;

pub use solana_generator_derive::AccountArgument;

use crate::{AccountInfo, GeneratorError, GeneratorResult, SystemProgram};
use std::fmt::Debug;

/// A set of accounts that can be derived from an iterator over [`AccountInfo`]s and instruction data
///
/// # Included Derivations
/// ## [`Vec`]:
/// [`AccountArgument`] is implemented for [`Vec`]s over type `T` where `T` implements [`AccountArgument`].
/// Its [`InstructionArg`](AccountArgument::InstructionArg) is `(usize, T::InstructionArg)` and requires that `T::InstructionArg` implement [`Clone`].
/// The indexes of the tuple are:
/// 0. The size of the vector (`0` is acceptable)
/// 1. The instruction argument that will be copied to all indices
///
/// ## [`VecDeque`]:
/// Same as `Vec` implementation
///
/// ## `[T; N]`:
/// [`AccountArgument`] is implemented for all arrays `[T; N]` where `T` implements [`AccountArgument`].
/// It's instruction argument is `[T::InstructionArg; N]`.
/// Each index will be passed its corresponding argument.
pub trait AccountArgument: Sized {
    /// The data passed for this argument to be parsed.
    type InstructionArg;

    /// Creates this argument from an [`AccountInfo`] iterator and [`InstructionArg`](AccountArgument::InstructionArg).
    /// - `program_id` is the current program's id.
    /// - `infos` is the iterator of [`AccountInfo`]s
    /// - `arg` is the [`InstructionArg`](AccountArgument::InstructionArg)
    fn from_account_infos(
        program_id: Pubkey,
        infos: &mut impl Iterator<Item = AccountInfo>,
        arg: Self::InstructionArg,
    ) -> GeneratorResult<Self>;
    /// Writes the accounts back to the chain.
    /// - `program_id` is the current program's id.
    /// - `system_program` is an option reference to the system program's account info.
    fn write_back(
        self,
        program_id: Pubkey,
        system_program: Option<&SystemProgram>,
    ) -> GeneratorResult<()>;
    /// Adds all keys from this account to a given function.
    fn add_keys(&self, add: impl FnMut(Pubkey) -> GeneratorResult<()>) -> GeneratorResult<()>;
    /// Collects all the keys in a [`Vec`].
    fn keys(&self) -> GeneratorResult<Vec<Pubkey>> {
        let mut out = Vec::new();
        self.add_keys(|key| {
            out.push(key);
            Ok(())
        })?;
        Ok(out)
    }
}
/// An account set that can be indexed by 0+ accounts at time with index `I`.
pub trait MultiIndexableAccountArgument<I>: AccountArgument
where
    I: Debug + Clone,
{
    /// Returns whether the account at index `indexer` is a signer.
    fn is_signer(&self, indexer: I) -> GeneratorResult<bool>;
    /// Returns whether the account at index `indexer` is writable.
    fn is_writable(&self, indexer: I) -> GeneratorResult<bool>;
    /// Returns whether the account at index `indexer`'s owner is `owner`.
    fn is_owner(&self, owner: Pubkey, indexer: I) -> GeneratorResult<bool>;
}
/// An account set that can be indexed to a single account at a time with index `I`.
pub trait SingleIndexableAccountArgument<I>: MultiIndexableAccountArgument<I>
where
    I: Debug + Clone,
{
    /// Gets the owner of the account at index `indexer`.
    fn owner(&self, indexer: I) -> GeneratorResult<Pubkey>;
    /// Gets the key of the account at index `indexer`.
    fn key(&self, indexer: I) -> GeneratorResult<Pubkey>;
}

/// Asserts that the account at index `indexer` is a signer.
pub fn assert_is_signer<I>(
    argument: &impl MultiIndexableAccountArgument<I>,
    indexer: I,
) -> GeneratorResult<()>
where
    I: Debug + Clone,
{
    if argument.is_signer(indexer.clone())? {
        Ok(())
    } else {
        Err(GeneratorError::AccountsSignerError {
            accounts: argument.keys()?,
            indexer: format!("{:?}", indexer),
        }
        .into())
    }
}

/// Asserts that the account at index `indexer` is writable.
pub fn assert_is_writable<I>(
    argument: &impl MultiIndexableAccountArgument<I>,
    indexer: I,
) -> GeneratorResult<()>
where
    I: Debug + Clone,
{
    if argument.is_writable(indexer.clone())? {
        Ok(())
    } else {
        Err(GeneratorError::AccountsWritableError {
            accounts: argument.keys()?,
            indexer: format!("{:?}", indexer),
        }
        .into())
    }
}

/// Asserts that the account at index `indexer`'s owner is `owner`.
pub fn assert_is_owner<I>(
    argument: &impl MultiIndexableAccountArgument<I>,
    owner: Pubkey,
    indexer: I,
) -> GeneratorResult<()>
where
    I: Debug + Clone,
{
    if argument.is_owner(owner, indexer.clone())? {
        Ok(())
    } else {
        Err(GeneratorError::AccountsOwnerError {
            accounts: argument.keys()?,
            indexer: format!("{:?}", indexer),
            owner,
        }
        .into())
    }
}