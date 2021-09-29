use crate::{AccountArgument, AccountInfo, FromAccounts, GeneratorResult, Pubkey, SystemProgram};
use std::iter::once;

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
        infos: &mut impl Iterator<Item = AccountInfo>,
        arg: A,
    ) -> GeneratorResult<Self> {
        let mut out = Vec::new();
        let mut infos = Box::new(infos) as Box<dyn Iterator<Item = AccountInfo>>;
        while let Some(info) = infos.next() {
            infos = Box::new(once(info).chain(infos));
            out.push(T::from_accounts(program_id, &mut infos, arg.clone())?);
        }
        Ok(Self(out))
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
