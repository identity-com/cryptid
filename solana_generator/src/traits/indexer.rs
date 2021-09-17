use crate::solana_program::pubkey::Pubkey;
use crate::{GeneratorResult, MultiIndexableAccountArgument};
use std::fmt::Debug;
use std::ops::{Range, RangeFrom, RangeInclusive, RangeTo, RangeToInclusive};

/// An index that checks that all accounts return [`true`], [`true`] on empty.
/// See [`AllAny`].
#[derive(Copy, Clone, Default, Debug)]
pub struct All;
/// An index that checks that any accounts return [`false`], [`false`] on empty.
/// See [`AllAny`].
#[derive(Copy, Clone, Default, Debug)]
pub struct NotAll;
/// An index that checks that any accounts return [`true`], [`false`] on empty.
/// See [`AllAny`].
#[derive(Copy, Clone, Default, Debug)]
pub struct Any;
/// An index that checks that none of the accounts return [`true`], [`true`] on empty.
/// See [`AllAny`].
#[derive(Copy, Clone, Default, Debug)]
pub struct NotAny;

/// Returns [`None`] if any in range return [`None`] unless already short circuited.
/// If you want to implement for `MultiIndexableAccountArgument<AllAny>`, implement for `MultiIndexableAccountArgument<(AllAny, ())>` instead so blankets work better.
/// Implementing for `MultiIndexableAccountArgument<(AllAny, I)>` also implements for `MultiIndexableAccountArgument<(X, I)>` where X is [`All`], [`NotAll`], [`Any`], and [`NotAny`].
#[derive(Copy, Clone, Debug)]
pub enum AllAny {
    /// Returns [`true`] on empty
    All,
    /// Returns [`false`] on empty
    NotAll,
    /// Returns [`false`] on empty
    Any,
    /// Returns [`true`] on empty
    NotAny,
}
impl AllAny {
    /// Runs a function against an iterator following the strategy determined by `self`.
    pub fn run_func<T>(
        self,
        iter: impl IntoIterator<Item = T>,
        func: impl FnMut(T) -> GeneratorResult<bool>,
    ) -> GeneratorResult<bool> {
        Ok(self.is_not()
            ^ if self.is_all() {
                Self::result_all(iter.into_iter(), func)?
            } else {
                Self::option_any(iter.into_iter(), func)?
            })
    }

    fn result_all<T>(
        iter: impl Iterator<Item = T>,
        mut func: impl FnMut(T) -> GeneratorResult<bool>,
    ) -> GeneratorResult<bool> {
        for item in iter {
            if !func(item)? {
                return Ok(false);
            }
        }
        Ok(true)
    }
    fn option_any<T>(
        iter: impl Iterator<Item = T>,
        mut func: impl FnMut(T) -> GeneratorResult<bool>,
    ) -> GeneratorResult<bool> {
        for item in iter {
            if func(item)? {
                return Ok(true);
            }
        }
        Ok(false)
    }

    /// Returns [`true`] if is [`All`] or [`NotAll`], [`false`] otherwise
    pub const fn is_all(self) -> bool {
        match self {
            Self::All | Self::NotAll => true,
            Self::Any | Self::NotAny => false,
        }
    }

    /// Returns [`true`] if is [`Any`] or [`NotAny`], [`false`] otherwise
    pub const fn is_any(self) -> bool {
        match self {
            Self::All | Self::NotAll => false,
            Self::Any | Self::NotAny => true,
        }
    }

    /// Returns [`true`] if is [`NotAll`] or [`NotAny`], [`false`] otherwise
    pub const fn is_not(self) -> bool {
        match self {
            Self::All | Self::Any => false,
            Self::NotAll | Self::NotAny => true,
        }
    }
}
impl_indexed_for_unit!(AllAny, yield no single[][]);

impl<T, I> MultiIndexableAccountArgument<(All, I)> for T
where
    T: MultiIndexableAccountArgument<(AllAny, I)>,
    I: Debug + Clone,
{
    fn is_signer(&self, indexer: (All, I)) -> GeneratorResult<bool> {
        self.is_signer((AllAny::All, indexer.1))
    }

    fn is_writable(&self, indexer: (All, I)) -> GeneratorResult<bool> {
        self.is_writable((AllAny::All, indexer.1))
    }

    fn is_owner(&self, owner: Pubkey, indexer: (All, I)) -> GeneratorResult<bool> {
        self.is_owner(owner, (AllAny::All, indexer.1))
    }
}
impl<T> MultiIndexableAccountArgument<All> for T
where
    T: MultiIndexableAccountArgument<AllAny>,
{
    fn is_signer(&self, _indexer: All) -> GeneratorResult<bool> {
        self.is_signer(AllAny::All)
    }

    fn is_writable(&self, _indexer: All) -> GeneratorResult<bool> {
        self.is_writable(AllAny::All)
    }

    fn is_owner(&self, owner: Pubkey, _indexer: All) -> GeneratorResult<bool> {
        self.is_owner(owner, AllAny::All)
    }
}
impl<T, I> MultiIndexableAccountArgument<(NotAll, I)> for T
where
    T: MultiIndexableAccountArgument<(AllAny, I)>,
    I: Debug + Clone,
{
    fn is_signer(&self, indexer: (NotAll, I)) -> GeneratorResult<bool> {
        self.is_signer((AllAny::NotAll, indexer.1))
    }

    fn is_writable(&self, indexer: (NotAll, I)) -> GeneratorResult<bool> {
        self.is_writable((AllAny::NotAll, indexer.1))
    }

    fn is_owner(&self, owner: Pubkey, indexer: (NotAll, I)) -> GeneratorResult<bool> {
        self.is_owner(owner, (AllAny::NotAll, indexer.1))
    }
}
impl<T> MultiIndexableAccountArgument<NotAll> for T
where
    T: MultiIndexableAccountArgument<AllAny>,
{
    fn is_signer(&self, _indexer: NotAll) -> GeneratorResult<bool> {
        self.is_signer(AllAny::NotAll)
    }

    fn is_writable(&self, _indexer: NotAll) -> GeneratorResult<bool> {
        self.is_writable(AllAny::NotAll)
    }

    fn is_owner(&self, owner: Pubkey, _indexer: NotAll) -> GeneratorResult<bool> {
        self.is_owner(owner, AllAny::NotAll)
    }
}
impl<T, I> MultiIndexableAccountArgument<(Any, I)> for T
where
    T: MultiIndexableAccountArgument<(AllAny, I)>,
    I: Debug + Clone,
{
    fn is_signer(&self, indexer: (Any, I)) -> GeneratorResult<bool> {
        self.is_signer((AllAny::Any, indexer.1))
    }

    fn is_writable(&self, indexer: (Any, I)) -> GeneratorResult<bool> {
        self.is_writable((AllAny::Any, indexer.1))
    }

    fn is_owner(&self, owner: Pubkey, indexer: (Any, I)) -> GeneratorResult<bool> {
        self.is_owner(owner, (AllAny::Any, indexer.1))
    }
}
impl<T> MultiIndexableAccountArgument<Any> for T
where
    T: MultiIndexableAccountArgument<AllAny>,
{
    fn is_signer(&self, _indexer: Any) -> GeneratorResult<bool> {
        self.is_signer(AllAny::Any)
    }

    fn is_writable(&self, _indexer: Any) -> GeneratorResult<bool> {
        self.is_writable(AllAny::Any)
    }

    fn is_owner(&self, owner: Pubkey, _indexer: Any) -> GeneratorResult<bool> {
        self.is_owner(owner, AllAny::Any)
    }
}
impl<T, I> MultiIndexableAccountArgument<(NotAny, I)> for T
where
    T: MultiIndexableAccountArgument<(AllAny, I)>,
    I: Debug + Clone,
{
    fn is_signer(&self, indexer: (NotAny, I)) -> GeneratorResult<bool> {
        self.is_signer((AllAny::NotAny, indexer.1))
    }

    fn is_writable(&self, indexer: (NotAny, I)) -> GeneratorResult<bool> {
        self.is_writable((AllAny::NotAny, indexer.1))
    }

    fn is_owner(&self, owner: Pubkey, indexer: (NotAny, I)) -> GeneratorResult<bool> {
        self.is_owner(owner, (AllAny::NotAny, indexer.1))
    }
}
impl<T> MultiIndexableAccountArgument<NotAny> for T
where
    T: MultiIndexableAccountArgument<AllAny>,
{
    fn is_signer(&self, _indexer: NotAny) -> GeneratorResult<bool> {
        self.is_signer(AllAny::NotAny)
    }

    fn is_writable(&self, _indexer: NotAny) -> GeneratorResult<bool> {
        self.is_writable(AllAny::NotAny)
    }

    fn is_owner(&self, owner: Pubkey, _indexer: NotAny) -> GeneratorResult<bool> {
        self.is_owner(owner, AllAny::NotAny)
    }
}

/// A range that is that can be executed with [`AllAny`].
/// Also implements `MultiIndexableAccountArgument<(Range, I)>`  and other [std range](std::ops::RangeBounds) types with default [`All`] strategy when implemented for `MultiIndexableAccountArgument<(AllAnyRange<R>, I)>`.
#[derive(Copy, Clone, Debug)]
pub struct AllAnyRange<R> {
    /// The range, should usually implement [`RangeBounds`](std::ops::RangeBounds)
    pub range: R,
    /// The execution strategy for this range.
    pub all_any: AllAny,
}
impl_indexed_for_unit!(AllAnyRange<R>, yield no single [gen: R][where: R: Debug, R: Clone]);

macro_rules! impl_range {
    ($range_gen:ident, $range_ty:ty) => {
        impl<T, $range_gen, I> MultiIndexableAccountArgument<($range_ty, I)> for T
        where
            T: MultiIndexableAccountArgument<(AllAnyRange<$range_ty>, I)>,
            $range_gen: Debug + Clone,
            I: Debug + Clone,
        {
            fn is_signer(&self, indexer: ($range_ty, I)) -> GeneratorResult<bool> {
                self.is_signer((
                    AllAnyRange {
                        range: indexer.0,
                        all_any: AllAny::All,
                    },
                    indexer.1,
                ))
            }

            fn is_writable(&self, indexer: ($range_ty, I)) -> GeneratorResult<bool> {
                self.is_writable((
                    AllAnyRange {
                        range: indexer.0,
                        all_any: AllAny::All,
                    },
                    indexer.1,
                ))
            }

            fn is_owner(&self, owner: Pubkey, indexer: ($range_ty, I)) -> GeneratorResult<bool> {
                self.is_owner(
                    owner,
                    (
                        AllAnyRange {
                            range: indexer.0,
                            all_any: AllAny::All,
                        },
                        indexer.1,
                    ),
                )
            }
        }

        impl_indexed_for_unit!($range_ty, yield no single [gen: $range_gen][where: $range_gen: Debug, $range_gen: Clone]);
    };
}
impl_range!(U, Range<U>);
impl_range!(U, RangeFrom<U>);
impl_range!(U, RangeInclusive<U>);
impl_range!(U, RangeTo<U>);
impl_range!(U, RangeToInclusive<U>);
