use std::collections::VecDeque;
use std::fmt::Debug;
use std::ops::RangeBounds;

use crate::{
    AccountArgument, AllAny, AllAnyRange, GeneratorError, GeneratorResult,
    MultiIndexableAccountArgument, Pubkey, SingleIndexableAccountArgument, SystemProgram,
};

impl<T> AccountArgument for VecDeque<T>
where
    T: AccountArgument,
{
    fn write_back(
        self,
        program_id: Pubkey,
        system_program: Option<&SystemProgram>,
    ) -> GeneratorResult<()> {
        for account in self {
            account.write_back(program_id, system_program)?;
        }
        Ok(())
    }

    fn add_keys(&self, mut add: impl FnMut(Pubkey) -> GeneratorResult<()>) -> GeneratorResult<()> {
        for account in self {
            account.add_keys(&mut add)?;
        }
        Ok(())
    }
}

impl<T, I> MultiIndexableAccountArgument<(AllAny, I)> for VecDeque<T>
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
impl<T, I> MultiIndexableAccountArgument<(usize, I)> for VecDeque<T>
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
impl<T, I> SingleIndexableAccountArgument<(usize, I)> for VecDeque<T>
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
impl<T, R, I> MultiIndexableAccountArgument<(AllAnyRange<R>, I)> for VecDeque<T>
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
