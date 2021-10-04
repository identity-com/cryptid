use crate::{
    AccountArgument, AccountInfoIterator, FromAccounts, GeneratorResult, Pubkey, SystemProgram,
};
use std::iter::once;
use std::ops::Deref;

/// An account argument that takes the rest of the accounts as type `T`
#[derive(Debug)]
pub struct Rest<T>(pub Vec<T>);
impl<T> AccountArgument for Rest<T>
where
    T: AccountArgument,
{
    fn write_back(
        self,
        program_id: Pubkey,
        system_program: Option<&SystemProgram>,
    ) -> GeneratorResult<()> {
        self.0.write_back(program_id, system_program)
    }

    fn add_keys(&self, add: impl FnMut(Pubkey) -> GeneratorResult<()>) -> GeneratorResult<()> {
        self.0.add_keys(add)
    }
}
impl<A, T> FromAccounts<A> for Rest<T>
where
    T: FromAccounts<A>,
    A: Clone,
{
    fn from_accounts(
        program_id: Pubkey,
        mut infos: &mut impl AccountInfoIterator,
        arg: A,
    ) -> GeneratorResult<Self> {
        let mut out = match T::accounts_usage_hint().1 {
            Some(0) | None => Vec::new(),
            Some(upper) => Vec::with_capacity(infos.size_hint().0 / upper),
        };
        let mut next = infos.next();
        while let Some(info) = next {
            let mut iter = once(info).chain(&mut infos);
            out.push(T::from_accounts(program_id, &mut iter, arg.clone())?);
            next = iter.next();
        }
        Ok(Self(out))
    }

    fn accounts_usage_hint() -> (usize, Option<usize>) {
        (0, None)
    }
}
impl<T> Deref for Rest<T> {
    type Target = Vec<T>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
impl<T> IntoIterator for Rest<T> {
    type Item = <std::vec::Vec<T> as IntoIterator>::Item;
    type IntoIter = <std::vec::Vec<T> as IntoIterator>::IntoIter;

    fn into_iter(self) -> Self::IntoIter {
        self.0.into_iter()
    }
}
impl<'a, T> IntoIterator for &'a Rest<T>
where
    T: 'a,
{
    type Item = <&'a std::vec::Vec<T> as IntoIterator>::Item;
    type IntoIter = <&'a std::vec::Vec<T> as IntoIterator>::IntoIter;

    fn into_iter(self) -> Self::IntoIter {
        self.0.iter()
    }
}
impl<'a, T> IntoIterator for &'a mut Rest<T>
where
    T: 'a,
{
    type Item = <&'a mut std::vec::Vec<T> as IntoIterator>::Item;
    type IntoIter = <&'a mut std::vec::Vec<T> as IntoIterator>::IntoIter;

    fn into_iter(self) -> Self::IntoIter {
        self.0.iter_mut()
    }
}
