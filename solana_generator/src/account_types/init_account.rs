use std::io::Write;
use std::mem::size_of;
use std::num::NonZeroU64;
use std::ops::{Deref, DerefMut};

use borsh::BorshSerialize;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;
use solana_program::system_instruction::{allocate, assign};

use crate::traits::AccountArgument;
use crate::{
    invoke, Account, AccountInfo, Discriminant, GeneratorError, GeneratorResult,
    MultiIndexableAccountArgument, SingleIndexableAccountArgument, SystemProgram,
};

use super::SYSTEM_PROGRAM_ID;
use std::fmt::Debug;

/// The size the account will be initialized to.
#[derive(Clone, Debug)]
pub enum InitSize {
    /// Exact size needed for data
    DataSize,
    /// Size needed plus extra
    DataSizePlus(NonZeroU64),
    /// A set size, will error if not enough
    SetSize(u64),
}
impl Default for InitSize {
    fn default() -> Self {
        Self::DataSize
    }
}
/// An account that will be initialized by this instruction, must sign.
/// State given is owned by system program and not allocated.
/// Will be allocated and transferred to this program.
/// Requires system program is passed on write back.
#[derive(Debug)]
pub struct InitAccount<T>
where
    T: Account,
{
    /// The [`AccountInfo`] for this, data field will be overwritten on write back.
    pub info: AccountInfo,
    data: T,
    /// The size the account will be given on write back, set it directly
    pub init_size: InitSize,
}
impl<T> AccountArgument for InitAccount<T>
where
    T: Account + Default,
{
    type InstructionArg = ();

    fn from_account_infos(
        _program_id: Pubkey,
        infos: &mut impl Iterator<Item = AccountInfo>,
        _arg: Self::InstructionArg,
    ) -> GeneratorResult<Self> {
        let info = infos.next().ok_or(ProgramError::NotEnoughAccountKeys)?;

        if *info.owner.borrow() != &SYSTEM_PROGRAM_ID {
            return Err(GeneratorError::AccountOwnerNotEqual {
                account: info.key,
                owner: **info.owner.borrow(),
                expected_owner: Default::default(),
            }
            .into());
        }

        if !info.is_signer {
            return Err(GeneratorError::AccountIsNotSigner { account: info.key }.into());
        }

        if !info.is_writable {
            return Err(GeneratorError::CannotWrite { account: info.key }.into());
        }

        Ok(Self {
            info,
            data: T::default(),
            init_size: InitSize::default(),
        })
    }

    fn write_back(
        self,
        program_id: Pubkey,
        system_program: Option<&SystemProgram>,
    ) -> GeneratorResult<()> {
        let system_program = match system_program {
            None => return Err(GeneratorError::MissingSystemProgram.into()),
            Some(system_program) => {
                assert_eq!(system_program.info.key, SYSTEM_PROGRAM_ID);
                system_program
            }
        };

        let data = self.data.try_to_vec()?;
        let size = match self.init_size {
            InitSize::DataSize => (data.len() + size_of::<Discriminant>()) as u64,
            InitSize::DataSizePlus(plus) => {
                (data.len() + size_of::<Discriminant>()) as u64 + plus.get()
            }
            InitSize::SetSize(size) => {
                if size < (data.len() + size_of::<Discriminant>()) as u64 {
                    return Err(GeneratorError::NotEnoughSpaceInit {
                        account: self.info.key,
                        space_given: size,
                        space_needed: data.len() as u64,
                    }
                    .into());
                }
                size
            }
        };

        invoke(
            &allocate(&self.info.key, size),
            &[&self.info, &system_program.info],
        )?;

        invoke(
            &assign(&self.info.key, &program_id),
            &[&self.info, &system_program.info],
        )?;

        let mut account_data_ref = self.info.data.borrow_mut();
        let mut account_data = &mut **account_data_ref.deref_mut();
        T::DISCRIMINANT.serialize(&mut account_data)?;
        account_data.write_all(&data)?;
        Ok(())
    }

    fn add_keys(&self, add: impl FnMut(Pubkey) -> GeneratorResult<()>) -> GeneratorResult<()> {
        self.info.add_keys(add)
    }
}
impl<T, I> MultiIndexableAccountArgument<I> for InitAccount<T>
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
impl<T, I> SingleIndexableAccountArgument<I> for InitAccount<T>
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
impl<T> Deref for InitAccount<T>
where
    T: Account,
{
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.data
    }
}
impl<T> DerefMut for InitAccount<T>
where
    T: Account,
{
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.data
    }
}
