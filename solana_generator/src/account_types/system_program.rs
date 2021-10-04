use solana_program::pubkey::Pubkey;

use crate::traits::AccountArgument;
use crate::{
    AccountInfo, AccountInfoIterator, AllAny, FromAccounts, GeneratorError, GeneratorResult,
    MultiIndexableAccountArgument, SingleIndexableAccountArgument,
};

use super::SYSTEM_PROGRAM_ID;
use std::fmt::Debug;

/// The system program, will be checked that it actually is.
#[derive(Debug, Clone)]
pub struct SystemProgram {
    /// The system program's [`account info`].
    ///
    /// If `is_signer` or `is_writable` is ever [`true`] you probably just got a big bug bounty from Solana!
    pub info: AccountInfo,
}
impl AccountArgument for SystemProgram {
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
impl<A> FromAccounts<A> for SystemProgram
where
    AccountInfo: FromAccounts<A>,
{
    fn from_accounts(
        program_id: Pubkey,
        infos: &mut impl AccountInfoIterator,
        arg: A,
    ) -> GeneratorResult<Self> {
        let info = AccountInfo::from_accounts(program_id, infos, arg)?;
        if info.key != SYSTEM_PROGRAM_ID {
            return Err(GeneratorError::InvalidAccount {
                account: info.key,
                expected: SYSTEM_PROGRAM_ID,
            }
            .into());
        }
        Ok(Self { info })
    }

    fn accounts_usage_hint() -> (usize, Option<usize>) {
        AccountInfo::accounts_usage_hint()
    }
}
impl MultiIndexableAccountArgument<()> for SystemProgram {
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
impl MultiIndexableAccountArgument<AllAny> for SystemProgram {
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
impl SingleIndexableAccountArgument<()> for SystemProgram {
    fn owner(&self, indexer: ()) -> GeneratorResult<Pubkey> {
        self.info.owner(indexer)
    }

    fn key(&self, indexer: ()) -> GeneratorResult<Pubkey> {
        self.info.key(indexer)
    }
}
