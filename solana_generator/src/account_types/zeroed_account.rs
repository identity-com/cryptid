use std::ops::{Deref, DerefMut};

use borsh::BorshSerialize;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;

use crate::traits::AccountArgument;
use crate::{
    Account, AccountInfo, GeneratorError, GeneratorResult, MultiIndexableAccountArgument,
    SingleIndexableAccountArgument, SystemProgram,
};
use std::fmt::Debug;

/// An account that will be initialized by this program, all data is checked to be zeroed and owner is this program.
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
    type InstructionArg = ();

    fn from_account_infos(
        program_id: Pubkey,
        infos: &mut impl Iterator<Item = AccountInfo>,
        _arg: Self::InstructionArg,
    ) -> GeneratorResult<Self> {
        let info = infos.next().ok_or(ProgramError::NotEnoughAccountKeys)?;

        if **info.owner.borrow() != program_id {
            return Err(GeneratorError::AccountOwnerNotEqual {
                account: info.key,
                owner: **info.owner.borrow(),
                expected_owner: program_id,
            }
            .into());
        }

        if !info.is_writable {
            return Err(GeneratorError::CannotWrite { account: info.key }.into());
        }

        if !info.data.borrow().iter().all(|&byte| byte == 0) {
            return Err(GeneratorError::NonZeroedData { account: info.key }.into());
        }

        Ok(Self {
            info,
            data: T::default(),
        })
    }

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
impl<T, I> MultiIndexableAccountArgument<I> for ZeroedAccount<T>
where
    T: Account + Default,
    AccountInfo: MultiIndexableAccountArgument<I>,
    I: Debug + Clone,
{
    fn is_signer(&self, indexer: I) -> GeneratorResult<bool> {
        self.info.is_signer(indexer)
    }

    fn is_writable(&self, indexer: I) -> GeneratorResult<bool> {
        self.info.is_writable(indexer)
    }

    fn is_owner(&self, owner: Pubkey, indexer: I) -> GeneratorResult<bool> {
        self.info.is_owner(owner, indexer)
    }
}
impl<T, I> SingleIndexableAccountArgument<I> for ZeroedAccount<T>
where
    T: Account + Default,
    AccountInfo: SingleIndexableAccountArgument<I>,
    I: Debug + Clone,
{
    fn owner(&self, indexer: I) -> GeneratorResult<Pubkey> {
        self.info.owner(indexer)
    }

    fn key(&self, indexer: I) -> GeneratorResult<Pubkey> {
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
