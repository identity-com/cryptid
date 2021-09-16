use std::ops::{Deref, DerefMut};

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;

use crate::account_types::system_program::SystemProgram;
use crate::traits::AccountArgument;
use crate::{
    Account, AccountInfo, Discriminant, GeneratorError, GeneratorResult,
    MultiIndexableAccountArgument, SingleIndexableAccountArgument,
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
    type InstructionArg = ();

    fn from_account_infos(
        program_id: Pubkey,
        infos: &mut impl Iterator<Item = AccountInfo>,
        _arg: Self::InstructionArg,
    ) -> GeneratorResult<Self> {
        let info = infos.next().ok_or(ProgramError::NotEnoughAccountKeys)?;

        if *info.owner.borrow().deref() != &program_id {
            return Err(GeneratorError::AccountOwnerNotEqual {
                account: info.key,
                owner: **info.owner.borrow(),
                expected_owner: program_id,
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

        let data = T::deserialize(&mut account_data)?;
        drop(account_data_ref);
        Ok(Self { info, data })
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
impl<T, I> MultiIndexableAccountArgument<I> for ProgramAccount<T>
where
    T: Account,
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
impl<T, I> SingleIndexableAccountArgument<I> for ProgramAccount<T>
where
    T: Account,
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
