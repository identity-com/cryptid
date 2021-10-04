use crate::{GeneratorError, GeneratorResult};
use std::borrow::Cow;
use std::cmp::{max, min};
use std::convert::TryInto;
use std::ops::{Bound, RangeBounds};

/// (start, end), inclusive
pub fn convert_range(
    range: &impl RangeBounds<usize>,
    length: usize,
) -> GeneratorResult<(usize, usize)> {
    let start = match range.start_bound() {
        Bound::Included(val) => *val,
        Bound::Excluded(val) => val + 1,
        Bound::Unbounded => 0,
    };
    let end = match range.end_bound() {
        Bound::Included(val) => *val,
        Bound::Excluded(val) => val - 1,
        Bound::Unbounded => length - 1,
    };
    let (start, end) = if start <= end {
        (start, end)
    } else {
        (end, start)
    };
    if end >= length {
        Err(GeneratorError::IndexOutOfRange {
            index: format!(
                "{},{}",
                match range.start_bound() {
                    Bound::Included(val) => Cow::Owned(format!("[{}", val)),
                    Bound::Excluded(val) => Cow::Owned(format!("({}", val)),
                    Bound::Unbounded => Cow::Borrowed("["),
                },
                match range.end_bound() {
                    Bound::Included(val) => Cow::Owned(format!("{}]", val)),
                    Bound::Excluded(val) => Cow::Owned(format!("{})", val)),
                    Bound::Unbounded => Cow::Borrowed("]"),
                }
            ),
            possible_range: format!("[0, {})", length),
        }
        .into())
    } else {
        Ok((start, end))
    }
}

/// Adds the [`take_array`] and [`take_single`] functions. Intended for slice references.
pub trait Take<'a> {
    /// The inner type of this
    type Inner;
    /// Takes an array of inners by reference.
    fn take_array<const N: usize>(&mut self) -> GeneratorResult<&'a [Self::Inner; N]>;
    /// Takes a single instance by reference.
    fn take_single(&mut self) -> GeneratorResult<&'a Self::Inner> {
        Ok(&self.take_array::<1>()?[0])
    }
}
impl<'a, T> Take<'a> for &'a [T] {
    type Inner = T;

    fn take_array<const N: usize>(&mut self) -> GeneratorResult<&'a [Self::Inner; N]> {
        if self.len() < N {
            return Err(GeneratorError::NotEnoughData {
                expected: format!("{} bytes", N),
                found: format!("{} bytes", self.len()),
            }
            .into());
        }
        let out = self[0..N].try_into().unwrap();
        *self = &self[N..];
        Ok(out)
    }
}

/// Helper function to combine multiple size hints with a branch strategy, where the minimum lower bound and maximum upper bound are returned
pub fn combine_hints_branch(
    mut hints: impl Iterator<Item = (usize, Option<usize>)>,
) -> (usize, Option<usize>) {
    let (mut lower, mut upper) = match hints.next() {
        None => return (0, None),
        Some(hint) => hint,
    };
    for (hint_lower, hint_upper) in hints {
        lower = min(lower, hint_lower);
        upper = match (upper, hint_upper) {
            (Some(upper), Some(hint_upper)) => Some(max(upper, hint_upper)),
            _ => None,
        }
    }
    (lower, upper)
}

/// Helper function to combine multiple size hints with a chain strategy, where the sum of lower and upper bounds are returned
pub fn combine_hints_chain(
    mut hints: impl Iterator<Item = (usize, Option<usize>)>,
) -> (usize, Option<usize>) {
    let (mut lower, mut upper) = match hints.next() {
        None => return (0, None),
        Some(hint) => hint,
    };
    for (hint_lower, hint_upper) in hints {
        lower += hint_lower;
        upper = match (upper, hint_upper) {
            (Some(upper), Some(hint_upper)) => upper.checked_add(hint_upper),
            _ => None,
        }
    }
    (lower, upper)
}

/// Helper function to multiply a size hint by a number
pub fn mul_size_hint(hint: (usize, Option<usize>), mul: usize) -> (usize, Option<usize>) {
    (
        hint.0 * mul,
        match hint.1 {
            Some(upper) => upper.checked_mul(mul),
            None => None,
        },
    )
}
