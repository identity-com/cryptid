use crate::solana_program::program_error::ProgramError;
use crate::{
    combine_hints_branch, system_program_id, Account, AccountArgument, AccountInfo,
    AccountInfoIterator, AllAny, FromAccounts, GeneratorError, GeneratorResult, InitAccount,
    InitSize, MultiIndexableAccountArgument, Pubkey, SingleIndexableAccountArgument, SystemProgram,
    ZeroedAccount,
};
use std::array::IntoIter;
use std::iter::once;
use std::ops::{Deref, DerefMut};

/// A combination of [`InitAccount`] and [`ZeroedAccount`] accepting either based on owner.
/// Should call [`InitOrZeroedAccount::set_funder`] unless guaranteed not [`InitAccount`]
#[derive(Debug)]
pub enum InitOrZeroedAccount<T>
where
    T: Account,
{
    /// Is an [`InitAccount`]
    Init(InitAccount<T>),
    /// Is an [`ZeroedAccount`]
    Zeroed(ZeroedAccount<T>),
}
impl<T> InitOrZeroedAccount<T>
where
    T: Account,
{
    /// Sets the init size, no-op if zeroed
    pub fn set_init_size(&mut self, init_size: InitSize) {
        if let Self::Init(init) = self {
            init.init_size = init_size;
        }
    }

    /// Sets the funder, no-op if zeroed
    pub fn set_funder(&mut self, funder: AccountInfo) {
        if let Self::Init(init) = self {
            init.funder = Some(funder);
        }
    }

    /// Gets the account info
    pub fn info(&self) -> &AccountInfo {
        match self {
            InitOrZeroedAccount::Init(init) => &init.info,
            InitOrZeroedAccount::Zeroed(zeroed) => &zeroed.info,
        }
    }
}
impl<T> Deref for InitOrZeroedAccount<T>
where
    T: Account,
{
    type Target = T;

    fn deref(&self) -> &Self::Target {
        match self {
            InitOrZeroedAccount::Init(init) => init.deref(),
            InitOrZeroedAccount::Zeroed(zeroed) => zeroed.deref(),
        }
    }
}
impl<T> DerefMut for InitOrZeroedAccount<T>
where
    T: Account,
{
    fn deref_mut(&mut self) -> &mut Self::Target {
        match self {
            InitOrZeroedAccount::Init(init) => init.deref_mut(),
            InitOrZeroedAccount::Zeroed(zeroed) => zeroed.deref_mut(),
        }
    }
}
impl<T> AccountArgument for InitOrZeroedAccount<T>
where
    T: Account + Default,
{
    fn write_back(
        self,
        program_id: Pubkey,
        system_program: Option<&SystemProgram>,
    ) -> GeneratorResult<()> {
        match self {
            InitOrZeroedAccount::Init(init) => init.write_back(program_id, system_program),
            InitOrZeroedAccount::Zeroed(zeroed) => zeroed.write_back(program_id, system_program),
        }
    }

    fn add_keys(&self, add: impl FnMut(Pubkey) -> GeneratorResult<()>) -> GeneratorResult<()> {
        match self {
            InitOrZeroedAccount::Init(init) => init.add_keys(add),
            InitOrZeroedAccount::Zeroed(zeroed) => zeroed.add_keys(add),
        }
    }
}
impl<T, A> FromAccounts<A> for InitOrZeroedAccount<T>
where
    T: Account + Default,
    InitAccount<T>: FromAccounts<A>,
    ZeroedAccount<T>: FromAccounts<A>,
{
    fn from_accounts(
        program_id: Pubkey,
        infos: &mut impl AccountInfoIterator,
        arg: A,
    ) -> GeneratorResult<Self> {
        let info = infos.next().ok_or(ProgramError::NotEnoughAccountKeys)?;
        let owner = **info.owner.borrow();
        if owner == program_id {
            Ok(Self::Zeroed(ZeroedAccount::from_accounts(
                program_id,
                &mut once(info),
                arg,
            )?))
        } else if owner == system_program_id() {
            Ok(Self::Init(InitAccount::from_accounts(
                program_id,
                &mut once(info),
                arg,
            )?))
        } else {
            Err(GeneratorError::AccountOwnerNotEqual {
                account: Default::default(),
                owner: Default::default(),
                expected_owner: vec![program_id, system_program_id()],
            }
            .into())
        }
    }

    fn accounts_usage_hint() -> (usize, Option<usize>) {
        combine_hints_branch(IntoIter::new([
            <InitAccount<T> as FromAccounts<A>>::accounts_usage_hint(),
            <ZeroedAccount<T> as FromAccounts<A>>::accounts_usage_hint(),
        ]))
    }
}
impl<T> MultiIndexableAccountArgument<()> for InitOrZeroedAccount<T>
where
    T: Account + Default,
{
    fn is_signer(&self, indexer: ()) -> GeneratorResult<bool> {
        self.info().is_signer(indexer)
    }

    fn is_writable(&self, indexer: ()) -> GeneratorResult<bool> {
        self.info().is_writable(indexer)
    }

    fn is_owner(&self, owner: Pubkey, indexer: ()) -> GeneratorResult<bool> {
        self.info().is_owner(owner, indexer)
    }
}
impl<T> MultiIndexableAccountArgument<AllAny> for InitOrZeroedAccount<T>
where
    T: Account + Default,
{
    fn is_signer(&self, indexer: AllAny) -> GeneratorResult<bool> {
        self.info().is_signer(indexer)
    }

    fn is_writable(&self, indexer: AllAny) -> GeneratorResult<bool> {
        self.info().is_writable(indexer)
    }

    fn is_owner(&self, owner: Pubkey, indexer: AllAny) -> GeneratorResult<bool> {
        self.info().is_owner(owner, indexer)
    }
}
impl<T> SingleIndexableAccountArgument<()> for InitOrZeroedAccount<T>
where
    T: Account + Default,
{
    fn owner(&self, indexer: ()) -> GeneratorResult<Pubkey> {
        self.info().owner(indexer)
    }

    fn key(&self, indexer: ()) -> GeneratorResult<Pubkey> {
        self.info().key(indexer)
    }
}
