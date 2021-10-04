use std::ops::{Deref, DerefMut};

use borsh::BorshSerialize;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;

use crate::solana_program::sysvar::Sysvar;
use crate::traits::AccountArgument;
use crate::{
    Account, AccountInfo, AccountInfoIterator, AllAny, FromAccounts, GeneratorError,
    GeneratorResult, MultiIndexableAccountArgument, SingleIndexableAccountArgument, SystemProgram,
};
use solana_program::rent::Rent;
use std::fmt::Debug;

/// An account that will be initialized by this program, all data is checked to be zeroed and owner is this program.
/// Account must be rent exempt.
#[derive(Debug)]
pub struct ZeroedAccount<T>
where
    T: Account,
{
    /// The [`AccountInfo`] for this, data field will be overwritten on write back.
    pub info: AccountInfo,
    data: T,
}
impl<T> AccountArgument for ZeroedAccount<T>
where
    T: Account + Default,
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
impl<A, T> FromAccounts<A> for ZeroedAccount<T>
where
    T: Account + Default,
    AccountInfo: FromAccounts<A>,
{
    fn from_accounts(
        program_id: Pubkey,
        infos: &mut impl AccountInfoIterator,
        arg: A,
    ) -> GeneratorResult<Self> {
        let info = AccountInfo::from_accounts(program_id, infos, arg)?;

        if **info.owner.borrow() != program_id {
            return Err(GeneratorError::AccountOwnerNotEqual {
                account: info.key,
                owner: **info.owner.borrow(),
                expected_owner: vec![program_id],
            }
            .into());
        }

        if !info.is_writable {
            return Err(GeneratorError::CannotWrite { account: info.key }.into());
        }

        if !info.data.borrow().iter().all(|&byte| byte == 0) {
            return Err(GeneratorError::NonZeroedData { account: info.key }.into());
        }

        let rent = Rent::get()?.minimum_balance(info.data.borrow().len());
        if **info.lamports.borrow() < rent {
            return Err(ProgramError::AccountNotRentExempt.into());
        }

        Ok(Self {
            info,
            data: T::default(),
        })
    }

    fn accounts_usage_hint() -> (usize, Option<usize>) {
        AccountInfo::accounts_usage_hint()
    }
}
impl<T> MultiIndexableAccountArgument<()> for ZeroedAccount<T>
where
    T: Account + Default,
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
impl<T> MultiIndexableAccountArgument<AllAny> for ZeroedAccount<T>
where
    T: Account + Default,
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
impl<T> SingleIndexableAccountArgument<()> for ZeroedAccount<T>
where
    T: Account + Default,
{
    fn owner(&self, indexer: ()) -> GeneratorResult<Pubkey> {
        self.info.owner(indexer)
    }

    fn key(&self, indexer: ()) -> GeneratorResult<Pubkey> {
        self.info.key(indexer)
    }
}
impl<T> Deref for ZeroedAccount<T>
where
    T: Account,
{
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.data
    }
}
impl<T> DerefMut for ZeroedAccount<T>
where
    T: Account,
{
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.data
    }
}
