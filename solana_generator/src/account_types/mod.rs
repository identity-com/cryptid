use std::array::IntoIter;
use std::collections::VecDeque;
use std::fmt::Debug;
use std::ops::RangeBounds;

use array_init::try_array_init;
use solana_program::pubkey::Pubkey;
use solana_program::system_program::ID as SYSTEM_PROGRAM_ID;

pub use init_account::*;
pub use init_or_zeroed_account::*;
pub use program_account::*;
pub use rest::*;
pub use system_program::*;
pub use zeroed_account::*;

use crate::traits::AccountArgument;
use crate::{
    util, AccountInfo, AllAny, AllAnyRange, GeneratorError, GeneratorResult,
    MultiIndexableAccountArgument, SingleIndexableAccountArgument,
};

mod init_account;
mod init_or_zeroed_account;
mod program_account;
mod rest;
mod system_program;
mod zeroed_account;

impl<T> AccountArgument for Vec<T>
where
    T: AccountArgument,
    T::InstructionArg: Clone,
{
    type InstructionArg = (usize, T::InstructionArg);

    fn from_account_infos(
        program_id: Pubkey,
        infos: &mut impl Iterator<Item = AccountInfo>,
        data: &mut &[u8],
        arg: Self::InstructionArg,
    ) -> GeneratorResult<Self> {
        let mut out = Vec::with_capacity(arg.0);
        if arg.0 != 0 {
            for _ in 0..arg.0 - 1 {
                out.push(T::from_account_infos(
                    program_id,
                    infos,
                    data,
                    arg.1.clone(),
                )?);
            }
            out.push(T::from_account_infos(program_id, infos, data, arg.1)?);
        }
        Ok(out)
    }

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
impl<T> AccountArgument for VecDeque<T>
where
    T: AccountArgument,
    T::InstructionArg: Clone,
{
    type InstructionArg = (usize, T::InstructionArg);

    fn from_account_infos(
        program_id: Pubkey,
        infos: &mut impl Iterator<Item = AccountInfo>,
        data: &mut &[u8],
        arg: Self::InstructionArg,
    ) -> GeneratorResult<Self> {
        let mut out = VecDeque::with_capacity(arg.0);
        if arg.0 != 0 {
            for _ in 0..arg.0 - 1 {
                out.push_back(T::from_account_infos(
                    program_id,
                    infos,
                    data,
                    arg.1.clone(),
                )?);
            }
            out.push_back(T::from_account_infos(program_id, infos, data, arg.1)?);
        }
        Ok(out)
    }

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
impl<T, const N: usize> AccountArgument for [T; N]
where
    T: AccountArgument,
{
    type InstructionArg = [T::InstructionArg; N];

    fn from_account_infos(
        program_id: Pubkey,
        infos: &mut impl Iterator<Item = AccountInfo>,
        data: &mut &[u8],
        arg: Self::InstructionArg,
    ) -> GeneratorResult<Self> {
        let mut iter = IntoIter::new(arg);
        try_array_init(|_| T::from_account_infos(program_id, infos, data, iter.next().unwrap()))
    }

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

impl<T, I> MultiIndexableAccountArgument<(AllAny, I)> for Vec<T>
where
    T: AccountArgument + MultiIndexableAccountArgument<I>,
    T::InstructionArg: Clone,
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
impl<T, I> MultiIndexableAccountArgument<(usize, I)> for Vec<T>
where
    T: AccountArgument + MultiIndexableAccountArgument<I>,
    T::InstructionArg: Clone,
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
    T::InstructionArg: Clone,
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
    T::InstructionArg: Clone,
    R: RangeBounds<usize> + Clone + Debug,
    I: Debug + Clone,
{
    fn is_signer(&self, indexer: (AllAnyRange<R>, I)) -> GeneratorResult<bool> {
        let (start, end) = util::convert_range(&indexer.0.range, self.len())?;
        indexer
            .0
            .all_any
            .run_func(self.iter().skip(start).take(end - start + 1), |val| {
                val.is_signer(indexer.1.clone())
            })
    }

    fn is_writable(&self, indexer: (AllAnyRange<R>, I)) -> GeneratorResult<bool> {
        let (start, end) = util::convert_range(&indexer.0.range, self.len())?;
        indexer
            .0
            .all_any
            .run_func(self.iter().skip(start).take(end - start + 1), |val| {
                val.is_writable(indexer.1.clone())
            })
    }

    fn is_owner(&self, owner: Pubkey, indexer: (AllAnyRange<R>, I)) -> GeneratorResult<bool> {
        let (start, end) = util::convert_range(&indexer.0.range, self.len())?;
        indexer
            .0
            .all_any
            .run_func(self.iter().skip(start).take(end - start + 1), |val| {
                val.is_owner(owner, indexer.1.clone())
            })
    }
}

impl<T, I> MultiIndexableAccountArgument<(AllAny, I)> for VecDeque<T>
where
    T: AccountArgument + MultiIndexableAccountArgument<I>,
    T::InstructionArg: Clone,
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
    T::InstructionArg: Clone,
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
    T::InstructionArg: Clone,
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
    T::InstructionArg: Clone,
    R: RangeBounds<usize> + Clone + Debug,
    I: Debug + Clone,
{
    fn is_signer(&self, indexer: (AllAnyRange<R>, I)) -> GeneratorResult<bool> {
        let (start, end) = util::convert_range(&indexer.0.range, self.len())?;
        indexer
            .0
            .all_any
            .run_func(self.iter().skip(start).take(end - start + 1), |val| {
                val.is_signer(indexer.1.clone())
            })
    }

    fn is_writable(&self, indexer: (AllAnyRange<R>, I)) -> GeneratorResult<bool> {
        let (start, end) = util::convert_range(&indexer.0.range, self.len())?;
        indexer
            .0
            .all_any
            .run_func(self.iter().skip(start).take(end - start + 1), |val| {
                val.is_writable(indexer.1.clone())
            })
    }

    fn is_owner(&self, owner: Pubkey, indexer: (AllAnyRange<R>, I)) -> GeneratorResult<bool> {
        let (start, end) = util::convert_range(&indexer.0.range, self.len())?;
        indexer
            .0
            .all_any
            .run_func(self.iter().skip(start).take(end - start + 1), |val| {
                val.is_owner(owner, indexer.1.clone())
            })
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
        let (start, end) = util::convert_range(&indexer.0.range, self.len())?;
        indexer
            .0
            .all_any
            .run_func(self.iter().skip(start).take(end - start + 1), |val| {
                val.is_signer(indexer.1.clone())
            })
    }

    fn is_writable(&self, indexer: (AllAnyRange<R>, I)) -> GeneratorResult<bool> {
        let (start, end) = util::convert_range(&indexer.0.range, self.len())?;
        indexer
            .0
            .all_any
            .run_func(self.iter().skip(start).take(end - start + 1), |val| {
                val.is_writable(indexer.1.clone())
            })
    }

    fn is_owner(&self, owner: Pubkey, indexer: (AllAnyRange<R>, I)) -> GeneratorResult<bool> {
        let (start, end) = util::convert_range(&indexer.0.range, self.len())?;
        indexer
            .0
            .all_any
            .run_func(self.iter().skip(start).take(end - start + 1), |val| {
                val.is_owner(owner, indexer.1.clone())
            })
    }
}
