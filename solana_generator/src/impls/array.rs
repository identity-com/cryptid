use std::array::IntoIter;
use std::fmt::Debug;
use std::ops::RangeBounds;

use array_init::try_array_init;

use crate::{
    mul_size_hint, AccountArgument, AccountInfoIterator, AllAny, AllAnyRange, FromAccounts,
    GeneratorError, GeneratorResult, MultiIndexableAccountArgument, Pubkey,
    SingleIndexableAccountArgument, SystemProgram,
};

impl<T, const N: usize> AccountArgument for [T; N]
where
    T: AccountArgument,
{
    fn write_back(
        self,
        program_id: Pubkey,
        system_program: Option<&SystemProgram>,
    ) -> GeneratorResult<()> {
        for item in IntoIter::new(self) {
            item.write_back(program_id, system_program)?;
        }
        Ok(())
    }

    fn add_keys(&self, mut add: impl FnMut(Pubkey) -> GeneratorResult<()>) -> GeneratorResult<()> {
        self.iter()
            .map(|inner| inner.add_keys(&mut add))
            .find(|res| res.is_err())
            .unwrap_or(Ok(()))
    }
}
impl<A, T, const N: usize> FromAccounts<[A; N]> for [T; N]
where
    T: FromAccounts<A>,
{
    fn from_accounts(
        program_id: Pubkey,
        infos: &mut impl AccountInfoIterator,
        arg: [A; N],
    ) -> GeneratorResult<Self> {
        let mut iter = IntoIter::new(arg);
        try_array_init(|_| T::from_accounts(program_id, infos, iter.next().unwrap()))
    }

    fn accounts_usage_hint() -> (usize, Option<usize>) {
        mul_size_hint(T::accounts_usage_hint(), N)
    }
}
impl<A, T, const N: usize> FromAccounts<(A,)> for [T; N]
where
    T: FromAccounts<A>,
    A: Clone,
{
    fn from_accounts(
        program_id: Pubkey,
        infos: &mut impl AccountInfoIterator,
        arg: (A,),
    ) -> GeneratorResult<Self> {
        try_array_init(|_| T::from_accounts(program_id, infos, arg.0.clone()))
    }

    fn accounts_usage_hint() -> (usize, Option<usize>) {
        mul_size_hint(T::accounts_usage_hint(), N)
    }
}
impl<T, const N: usize> FromAccounts<()> for [T; N]
where
    T: FromAccounts<()>,
{
    fn from_accounts(
        program_id: Pubkey,
        infos: &mut impl AccountInfoIterator,
        arg: (),
    ) -> GeneratorResult<Self> {
        try_array_init(|_| T::from_accounts(program_id, infos, arg))
    }

    fn accounts_usage_hint() -> (usize, Option<usize>) {
        mul_size_hint(T::accounts_usage_hint(), N)
    }
}
impl<T, I, const N: usize> MultiIndexableAccountArgument<(AllAny, I)> for [T; N]
where
    T: AccountArgument + MultiIndexableAccountArgument<I>,
    I: Debug + Clone,
{
    fn is_signer(&self, indexer: (AllAny, I)) -> GeneratorResult<bool> {
        indexer
            .0
            .run_func(self.iter(), |val| val.is_signer(indexer.1.clone()))
    }

    fn is_writable(&self, indexer: (AllAny, I)) -> GeneratorResult<bool> {
        indexer
            .0
            .run_func(self.iter(), |val| val.is_writable(indexer.1.clone()))
    }

    fn is_owner(&self, owner: Pubkey, indexer: (AllAny, I)) -> GeneratorResult<bool> {
        indexer
            .0
            .run_func(self.iter(), |val| val.is_owner(owner, indexer.1.clone()))
    }
}
impl<T, I, const N: usize> MultiIndexableAccountArgument<(usize, I)> for [T; N]
where
    T: AccountArgument + MultiIndexableAccountArgument<I>,
    I: Debug + Clone,
{
    fn is_signer(&self, indexer: (usize, I)) -> GeneratorResult<bool> {
        self.get(indexer.0).map_or(
            Err(GeneratorError::IndexOutOfRange {
                index: indexer.0.to_string(),
                possible_range: format!("[0,{})", self.len()),
            }
            .into()),
            |val| val.is_signer(indexer.1),
        )
    }

    fn is_writable(&self, indexer: (usize, I)) -> GeneratorResult<bool> {
        self.get(indexer.0).map_or(
            Err(GeneratorError::IndexOutOfRange {
                index: indexer.0.to_string(),
                possible_range: format!("[0,{})", self.len()),
            }
            .into()),
            |val| val.is_writable(indexer.1),
        )
    }

    fn is_owner(&self, owner: Pubkey, indexer: (usize, I)) -> GeneratorResult<bool> {
        self.get(indexer.0).map_or(
            Err(GeneratorError::IndexOutOfRange {
                index: indexer.0.to_string(),
                possible_range: format!("[0,{})", self.len()),
            }
            .into()),
            |val| val.is_owner(owner, indexer.1),
        )
    }
}
impl<T, I, const N: usize> SingleIndexableAccountArgument<(usize, I)> for [T; N]
where
    T: AccountArgument + SingleIndexableAccountArgument<I>,
    I: Debug + Clone,
{
    fn owner(&self, indexer: (usize, I)) -> GeneratorResult<Pubkey> {
        self[indexer.0].owner(indexer.1)
    }

    fn key(&self, indexer: (usize, I)) -> GeneratorResult<Pubkey> {
        self[indexer.0].key(indexer.1)
    }
}
impl<T, R, I, const N: usize> MultiIndexableAccountArgument<(AllAnyRange<R>, I)> for [T; N]
where
    T: AccountArgument + MultiIndexableAccountArgument<I>,
    R: RangeBounds<usize> + Clone + Debug,
    I: Debug + Clone,
{
    fn is_signer(&self, indexer: (AllAnyRange<R>, I)) -> GeneratorResult<bool> {
        let (start, end) = crate::convert_range(&indexer.0.range, self.len())?;
        indexer
            .0
            .all_any
            .run_func(self.iter().skip(start).take(end - start + 1), |val| {
                val.is_signer(indexer.1.clone())
            })
    }

    fn is_writable(&self, indexer: (AllAnyRange<R>, I)) -> GeneratorResult<bool> {
        let (start, end) = crate::convert_range(&indexer.0.range, self.len())?;
        indexer
            .0
            .all_any
            .run_func(self.iter().skip(start).take(end - start + 1), |val| {
                val.is_writable(indexer.1.clone())
            })
    }

    fn is_owner(&self, owner: Pubkey, indexer: (AllAnyRange<R>, I)) -> GeneratorResult<bool> {
        let (start, end) = crate::convert_range(&indexer.0.range, self.len())?;
        indexer
            .0
            .all_any
            .run_func(self.iter().skip(start).take(end - start + 1), |val| {
                val.is_owner(owner, indexer.1.clone())
            })
    }
}
