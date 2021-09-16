use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;

use crate::traits::AccountArgument;
use crate::{
    AccountInfo, GeneratorError, GeneratorResult, MultiIndexableAccountArgument,
    SingleIndexableAccountArgument,
};

use super::SYSTEM_PROGRAM_ID;
use std::fmt::Debug;

/// The system program, will be checked that it actually is.
#[derive(Debug)]
pub struct SystemProgram {
    /// The system program's [`account info`].
    ///
    /// If `is_signer` or `is_writable` is ever [`true`] you probably just got a big bug bounty from Solana!
    pub info: AccountInfo,
}
impl AccountArgument for SystemProgram {
    type InstructionArg = ();

    fn from_account_infos(
        _program_id: Pubkey,
        infos: &mut impl Iterator<Item = AccountInfo>,
        _arg: Self::InstructionArg,
    ) -> GeneratorResult<Self> {
        let info = match infos.next() {
            None => return Err(ProgramError::NotEnoughAccountKeys.into()),
            Some(info) => info,
        };
        if info.key != SYSTEM_PROGRAM_ID {
            return Err(GeneratorError::InvalidAccount {
                account: info.key,
                expected: SYSTEM_PROGRAM_ID,
            }
            .into());
        }
        Ok(Self { info })
    }

    fn write_back(
        self,
        _program_id: Pubkey,
        _system_program: Option<&SystemProgram>,
    ) -> GeneratorResult<()> {
        Ok(())
    }

    fn add_keys(&self, add: impl FnMut(Pubkey) -> GeneratorResult<()>) -> GeneratorResult<()> {
        self.info.add_keys(add)
    }
}
impl<I> MultiIndexableAccountArgument<I> for SystemProgram
where
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
impl<I> SingleIndexableAccountArgument<I> for SystemProgram
where
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
