use crate::{GeneratorError, GeneratorResult};
use std::borrow::Cow;
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
        Ok(self[0..N].try_into().unwrap())
    }
}
