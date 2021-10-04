//! [`Discriminant`] type and relevant extras

use std::borrow::Cow;
use std::io::{ErrorKind, Read, Write};
use std::ops::Deref;

use crate::{GeneratorError, GeneratorResult};
use borsh::{BorshDeserialize, BorshSerialize};

/// A compressed discriminant that uses 1 bytes for 1 sized arrays with values 0-127 or one extra byte for arrays of size 1-127 (1 sized arrays only with values 127-255).
/// This is accomplished by having the most significant bit of the first byte being a flag whether the first byte is the value or number of remaining values.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Discriminant<'a>(pub Cow<'a, [u8]>);
impl<'a> Discriminant<'a> {
    /// The bit that determines if this is sized
    pub const SIZED_BIT: u8 = 1 << 7;

    /// Creates a discriminant from an array
    pub const fn from_array(array: &'a [u8]) -> Self {
        Self(Cow::Borrowed(array))
    }

    /// Creates an owned discriminant from a vector
    pub const fn from_vec(vec: Vec<u8>) -> Self {
        Self(Cow::Owned(vec))
    }

    /// The length of this discriminant when it is serialized
    pub fn discriminant_serialized_length(&self) -> GeneratorResult<usize> {
        if self.is_empty() {
            Err(GeneratorError::EmptyDiscriminant.into())
        } else if self.len() == 1 && self[0] & Self::SIZED_BIT == 0 {
            Ok(1)
        } else {
            Ok(1 + self.len())
        }
    }
}
impl<'a> Deref for Discriminant<'a> {
    type Target = [u8];

    fn deref(&self) -> &Self::Target {
        self.0.deref()
    }
}
impl<'a> BorshSerialize for Discriminant<'a> {
    fn serialize<W: Write>(&self, writer: &mut W) -> std::io::Result<()> {
        if self.is_empty() {
            Err(std::io::Error::new(
                ErrorKind::InvalidInput,
                "Invalid discriminant length: `0`",
            ))
        } else if self.len() == 1 && self[0] & Self::SIZED_BIT == 0 {
            writer.write_all(self.deref())
        } else if self.len() > (u8::MAX & !Self::SIZED_BIT) as usize {
            Err(std::io::Error::new(
                ErrorKind::InvalidInput,
                format!("Invalid discriminant length: `{}`", self.len()),
            ))
        } else {
            writer.write_all(&[self.len() as u8 | Self::SIZED_BIT])?;
            writer.write_all(self.deref())
        }
    }
}
impl<'a> BorshDeserialize for Discriminant<'a> {
    fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let mut first = [0];
        buf.read_exact(&mut first)?;
        if first[0] & Self::SIZED_BIT == 0 {
            Ok(Self(Cow::Owned(first.to_vec())))
        } else {
            let length = (first[0] & !Self::SIZED_BIT) as usize;
            let mut out = vec![0; length];
            buf.read_exact(&mut out)?;
            Ok(Self(Cow::Owned(out)))
        }
    }
}

#[cfg(test)]
mod test {
    use borsh::{BorshDeserialize, BorshSerialize};
    use rand::{thread_rng, Rng};

    use crate::discriminant::Discriminant;

    #[test]
    fn discriminant_borsh_single_test() {
        let mut rng = thread_rng();
        for _ in 0..128 {
            let data = [rng.gen()];
            let discriminant = Discriminant::from_array(&data);
            let bytes = BorshSerialize::try_to_vec(&discriminant)
                .unwrap_or_else(|_| panic!("Could not serialize: {:?}", data));
            let de_discriminant = BorshDeserialize::try_from_slice(&bytes)
                .unwrap_or_else(|_| panic!("Could not deserialize: {:?}", bytes));
            assert_eq!(discriminant, de_discriminant);
        }
    }

    #[test]
    fn discriminant_borsh_test() {
        let mut rng = thread_rng();
        for _ in 0..128 {
            let length = rng.gen_range(2..=16);
            let mut data = vec![0; length];
            for data_item in &mut data {
                *data_item = rng.gen();
            }
            let discriminant = Discriminant::from_array(&data);
            let bytes = BorshSerialize::try_to_vec(&discriminant)
                .unwrap_or_else(|_| panic!("Could not serialize: {:?}", data));
            let de_discriminant = BorshDeserialize::try_from_slice(&bytes)
                .unwrap_or_else(|_| panic!("Could not deserialize: {:?}", bytes));
            assert_eq!(discriminant, de_discriminant);
        }
    }
}
