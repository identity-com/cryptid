use std::ops::{Deref, DerefMut};

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

use crate::account_types::system_program::SystemProgram;
use crate::discriminant::Discriminant;
use crate::traits::AccountArgument;
use crate::{
    Account, AccountInfo, AccountInfoIterator, AllAny, FromAccounts, GeneratorError,
    GeneratorResult, MultiIndexableAccountArgument, SingleIndexableAccountArgument,
};
use std::fmt::Debug;

/// A data account owned by this program. Checks that is owned by this program.
#[derive(Debug)]
pub struct ProgramAccount<T>
where
    T: Account,
{
    /// The [`AccountInfo`] for this, data field will be overwritten on write back.
    pub info: AccountInfo,
    data: T,
}
impl<T> AccountArgument for ProgramAccount<T>
where
    T: Account,
{
    fn write_back(
        self,
        _program_id: Pubkey,
        _system_program: Option<&SystemProgram>,
    ) -> GeneratorResult<()> {
        let mut account_data_ref = self.info.data.borrow_mut();
        let mut account_data = &mut **account_data_ref.deref_mut();

        T::DISCRIMINANT.serialize(&mut account_data)?;
        self.data.serialize(&mut account_data)?;
        Ok(())
    }

    fn add_keys(&self, add: impl FnMut(Pubkey) -> GeneratorResult<()>) -> GeneratorResult<()> {
        self.info.add_keys(add)
    }
}
impl<T, A> FromAccounts<A> for ProgramAccount<T>
where
    AccountInfo: FromAccounts<A>,
    T: Account,
{
    fn from_accounts(
        program_id: Pubkey,
        infos: &mut impl AccountInfoIterator,
        arg: A,
    ) -> GeneratorResult<Self> {
        let info = AccountInfo::from_accounts(program_id, infos, arg)?;

        if *info.owner.borrow().deref() != &program_id {
            return Err(GeneratorError::AccountOwnerNotEqual {
                account: info.key,
                owner: **info.owner.borrow(),
                expected_owner: vec![program_id],
            }
            .into());
        }
        let account_data_ref = info.data.borrow();
        let mut account_data = &**account_data_ref.deref();

        let in_discriminant = Discriminant::deserialize(&mut account_data)?;
        if in_discriminant != T::DISCRIMINANT {
            return Err(GeneratorError::MismatchedDiscriminant {
                account: info.key,
                received: in_discriminant,
                expected: T::DISCRIMINANT,
            }
            .into());
        }

        let data = match T::deserialize(&mut account_data) {
            Ok(data) => data,
            Err(_) => {
                return Err(GeneratorError::CouldNotDeserialize {
                    what: format!("account: `{}`", info.key),
                }
                .into())
            }
        };
        drop(account_data_ref);
        Ok(Self { info, data })
    }

    fn accounts_usage_hint() -> (usize, Option<usize>) {
        AccountInfo::accounts_usage_hint()
    }
}
impl<T> MultiIndexableAccountArgument<()> for ProgramAccount<T>
where
    T: Account,
{
    fn is_signer(&self, indexer: ()) -> GeneratorResult<bool> {
        self.info.is_signer(indexer)
    }

    fn is_writable(&self, indexer: ()) -> GeneratorResult<bool> {
        self.info.is_writable(indexer)
    }

    fn is_owner(&self, owner: Pubkey, indexer: ()) -> GeneratorResult<bool> {
        self.info.is_owner(owner, indexer)
    }
}
impl<T> MultiIndexableAccountArgument<AllAny> for ProgramAccount<T>
where
    T: Account,
{
    fn is_signer(&self, indexer: AllAny) -> GeneratorResult<bool> {
        self.info.is_signer(indexer)
    }

    fn is_writable(&self, indexer: AllAny) -> GeneratorResult<bool> {
        self.info.is_writable(indexer)
    }

    fn is_owner(&self, owner: Pubkey, indexer: AllAny) -> GeneratorResult<bool> {
        self.info.is_owner(owner, indexer)
    }
}
impl<T> SingleIndexableAccountArgument<()> for ProgramAccount<T>
where
    T: Account,
{
    fn owner(&self, indexer: ()) -> GeneratorResult<Pubkey> {
        self.info.owner(indexer)
    }

    fn key(&self, indexer: ()) -> GeneratorResult<Pubkey> {
        self.info.key(indexer)
    }
}
impl<T> Deref for ProgramAccount<T>
where
    T: Account,
{
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.data
    }
}
impl<T> DerefMut for ProgramAccount<T>
where
    T: Account,
{
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.data
    }
}
