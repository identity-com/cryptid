use std::array::IntoIter;
use std::fmt::Debug;
use std::ops::RangeBounds;

use crate::{
    AccountArgument, AccountInfoIterator, AllAny, AllAnyRange, FromAccounts, GeneratorError,
    GeneratorResult, MultiIndexableAccountArgument, Pubkey, SingleIndexableAccountArgument,
    SystemProgram,
};

impl<T> AccountArgument for Vec<T>
where
    T: AccountArgument,
{
    fn write_back(
        self,
        program_id: Pubkey,
        system_program: Option<&SystemProgram>,
    ) -> GeneratorResult<()> {
        for item in self {
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
impl<T> FromAccounts<usize> for Vec<T>
where
    T: FromAccounts<()>,
{
    fn from_accounts(
        program_id: Pubkey,
        infos: &mut impl AccountInfoIterator,
        arg: usize,
    ) -> GeneratorResult<Self> {
        (0..arg)
            .map(|_| T::from_accounts(program_id, infos, ()))
            .collect::<Result<Vec<_>, _>>()
    }
}
impl<A, T> FromAccounts<Vec<A>> for Vec<T>
where
    T: FromAccounts<A>,
{
    fn from_accounts(
        program_id: Pubkey,
        infos: &mut impl AccountInfoIterator,
        arg: Vec<A>,
    ) -> GeneratorResult<Self> {
        let mut out = Vec::with_capacity(arg.len());
        for arg in arg {
            out.push(T::from_accounts(program_id, infos, arg)?);
        }
        Ok(out)
    }
}
impl<A, T> FromAccounts<(usize, A)> for Vec<T>
where
    T: FromAccounts<A>,
    A: Clone,
{
    fn from_accounts(
        program_id: Pubkey,
        infos: &mut impl AccountInfoIterator,
        arg: (usize, A),
    ) -> GeneratorResult<Self> {
        let mut out = Vec::with_capacity(arg.0);
        if arg.0 != 0 {
            for _ in 0..arg.0 - 1 {
                out.push(T::from_accounts(program_id, infos, arg.1.clone())?);
            }
            out.push(T::from_accounts(program_id, infos, arg.1)?);
        }
        Ok(out)
    }
}
impl<A, T, F> FromAccounts<(usize, F, ())> for Vec<T>
where
    T: FromAccounts<A>,
    F: FnMut(usize) -> A,
{
    fn from_accounts(
        program_id: Pubkey,
        infos: &mut impl AccountInfoIterator,
        mut arg: (usize, F, ()),
    ) -> GeneratorResult<Self> {
        let mut out = Vec::with_capacity(arg.0);
        for index in 0..arg.0 {
            out.push(T::from_accounts(program_id, infos, arg.1(index))?);
        }
        Ok(out)
    }
}

impl<A, T, const N: usize> FromAccounts<[A; N]> for Vec<T>
where
    T: FromAccounts<A>,
{
    fn from_accounts(
        program_id: Pubkey,
        infos: &mut impl AccountInfoIterator,
        arg: [A; N],
    ) -> GeneratorResult<Self> {
        Ok(IntoIter::new(<[T; N]>::from_accounts(program_id, infos, arg)?).collect())
    }
}
impl<T, I> MultiIndexableAccountArgument<(usize, I)> for Vec<T>
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
impl<T, I> SingleIndexableAccountArgument<(usize, I)> for Vec<T>
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
impl<T, R, I> MultiIndexableAccountArgument<(AllAnyRange<R>, I)> for Vec<T>
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
impl<T, I> MultiIndexableAccountArgument<(AllAny, I)> for Vec<T>
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
