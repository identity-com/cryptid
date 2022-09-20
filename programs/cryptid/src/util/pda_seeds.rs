// //! Support for type based PDAs
// use std::fmt::Debug;
// use std::iter::{once, Chain, Map, Once};
// use anchor_lang::prelude::*;
// use anchor_lang::solana_program::entrypoint::ProgramResult;
// use anchor_lang::solana_program::instruction::InstructionError::GenericError;
// use anchor_lang::solana_program::pubkey::PubkeyError;
// use crate::error::CryptidError;
//
// // use crate::util::cpi::CPI;
//
// /// A set of seeds for a pda
// #[derive(Debug)]
// pub struct PDASeedSet<'a> {
//     /// The seeder for these seeds
//     pub seeder: Box<dyn PDASeeder + 'a>,
//     /// The nonce of the account
//     pub nonce: [u8; 1],
// }
// impl<'a> PDASeedSet<'a> {
//     /// Creates a new set of seeds
//     pub fn new(seeder: impl PDASeeder + 'a, nonce: u8) -> Self {
//         Self::from_boxed(Box::new(seeder), nonce)
//     }
//
//     /// Finds a set of pda seeds
//     pub fn find(seeder: impl PDASeeder + 'a, program_id: &Pubkey) -> (Pubkey, Self) {
//         let (key, bump) = seeder.find_address(program_id);
//         (key, Self::from_boxed(Box::new(seeder), bump))
//     }
//
//     /// Creates a new set of seeds from an already boxed seeder
//     #[must_use]
//     pub fn from_boxed(seeder: Box<dyn PDASeeder + 'a>, nonce: u8) -> Self {
//         PDASeedSet {
//             seeder,
//             nonce: [nonce],
//         }
//     }
//
//     /// Verifies that a given address is derived from this seed set.
//     pub fn verify_address(&self, program_id: &Pubkey, address: &Pubkey) -> Result<()> {
//         self.seeder
//             .verify_address_with_nonce(program_id, address, self.nonce[0])
//     }
//
//     /// Creates the address from these seeds
//     pub fn create_address(&self, program_id: &Pubkey) -> Result<Pubkey> {
//         self.seeder.create_address(program_id, self.nonce[0])
//     }
//
//     /// Gets an iterator of the seeds
//     pub fn seeds(&self) -> impl Iterator<Item = &'_ dyn PDASeed> {
//         self.seeder.seeds().chain(once(&self.nonce as &dyn PDASeed))
//     }
//
//     /*
//     /// Invokes an instruction with these seeds
//     pub fn invoke_signed<'b, const N: usize>(
//         &self,
//         cpi: impl CPI,
//         instruction: &SolanaInstruction,
//         account_infos: &[&AccountInfo; N],
//     ) -> ProgramResult {
//         let seeds = self.seeds().map(AsRef::as_ref).collect::<Vec<_>>();
//
//         cpi.invoke_signed(instruction, account_infos, &[&seeds])
//     }
//
//     /// Invokes an instruction of variable account size with these seeds
//     pub fn invoke_signed_variable_size<'b, 'c, AI: 'b + ToSolanaAccountInfo<'c>>(
//         &self,
//         cpi: impl CPI,
//         instruction: &SolanaInstruction,
//         account_infos: impl IntoIterator<Item = &'b AI>,
//     ) -> ProgramResult {
//         let seeds = self.seeds().map(AsRef::as_ref).collect::<Vec<_>>();
//
//         cpi.invoke_signed_variable_size(instruction, account_infos, &[&seeds])
//     }
//
//     /// Invokes an instruction with given seed sets
//     pub fn invoke_signed_multiple<'b: 'a, 'c, AI: ToSolanaAccountInfo<'c>, const N: usize>(
//         cpi: impl CPI,
//         instruction: &SolanaInstruction,
//         account_infos: &[&AI; N],
//         seed_sets: impl IntoIterator<Item = &'a PDASeedSet<'b>>,
//     ) -> ProgramResult {
//         let seeds_array = seed_sets
//             .into_iter()
//             .map(|seed_set| seed_set.seeds().map(AsRef::as_ref).collect::<Vec<_>>())
//             .collect::<Vec<_>>();
//         let seeds = seeds_array.iter().map(AsRef::as_ref).collect::<Vec<_>>();
//
//         cpi.invoke_signed(instruction, account_infos, seeds.as_slice())
//     }
//
//     /// Invokes an instruction of variable account size with given seed sets
//     pub fn invoke_signed_variable_size_multiple<
//         'b: 'a,
//         'c,
//         'd,
//         AI: 'c + ToSolanaAccountInfo<'d>,
//     >(
//         cpi: impl CPI,
//         instruction: &SolanaInstruction,
//         account_infos: impl IntoIterator<Item = &'c AI>,
//         seed_sets: impl IntoIterator<Item = &'a PDASeedSet<'b>>,
//     ) -> ProgramResult {
//         let seeds_array = seed_sets
//             .into_iter()
//             .map(|seed_set| seed_set.seeds().map(AsRef::as_ref).collect::<Vec<_>>())
//             .collect::<Vec<_>>();
//         let seeds = seeds_array.iter().map(AsRef::as_ref).collect::<Vec<_>>();
//
//         cpi.invoke_signed_variable_size(instruction, account_infos, seeds.as_slice())
//     }
//      */
// }
// impl<'a> AsRef<PDASeedSet<'a>> for PDASeedSet<'a> {
//     fn as_ref(&self) -> &PDASeedSet<'a> {
//         self
//     }
// }
//
// /// A possible seed to a PDA.
// pub trait PDASeed: AsRef<[u8]> {
//     /// Turns the seed into a human readable string.
//     fn to_seed_string(&self) -> String;
// }
// impl PDASeed for Pubkey {
//     fn to_seed_string(&self) -> String {
//         format!("{}", self)
//     }
// }
// impl PDASeed for &str {
//     fn to_seed_string(&self) -> String {
//         String::from(*self)
//     }
// }
// impl PDASeed for String {
//     fn to_seed_string(&self) -> String {
//         self.clone()
//     }
// }
// impl PDASeed for &[u8] {
//     fn to_seed_string(&self) -> String {
//         format!("{:?}", self)
//     }
// }
// impl<const N: usize> PDASeed for [u8; N] {
//     fn to_seed_string(&self) -> String {
//         format!("{:?}", self)
//     }
// }
// impl PDASeed for Vec<u8> {
//     fn to_seed_string(&self) -> String {
//         format!("{:?}", self)
//     }
// }
//
// /// A set of seeds for a given PDA type.
// pub trait PDASeeder: Debug {
//     /// Gets an iterator of seeds for this address.
//     fn seeds<'a>(&'a self) -> Box<dyn Iterator<Item = &'a dyn PDASeed> + 'a>;
// }
// impl<'b, T: ?Sized> PDASeeder for &'b T
// where
//     T: PDASeeder,
// {
//     fn seeds<'a>(&'a self) -> Box<dyn Iterator<Item = &'a dyn PDASeed> + 'a> {
//         T::seeds(self)
//     }
// }
// impl<'b, T: ?Sized> PDASeeder for &'b mut T
// where
//     T: PDASeeder,
// {
//     fn seeds<'a>(&'a self) -> Box<dyn Iterator<Item = &'a dyn PDASeed> + 'a> {
//         T::seeds(self)
//     }
// }
// impl<T: ?Sized> PDASeeder for Box<T>
// where
//     T: PDASeeder,
// {
//     fn seeds<'a>(&'a self) -> Box<dyn Iterator<Item = &'a dyn PDASeed> + 'a> {
//         T::seeds(self)
//     }
// }
//
// /// Generates a PDA from a given seeder.
// pub trait PDAGenerator<'a, 'b, 'c>
// where
//     'a: 'c,
//     'b: 'c,
// {
//     /// Return type of [`PDAGenerator::seeds_to_bytes`]
//     type SeedsToBytesIter: Iterator<Item = &'a [u8]> + 'a;
//     /// Return type of [`PDAGenerator::seeds_to_bytes_with_nonce`]
//     type SeedsToBytesWithNonceIter: Iterator<Item = &'c [u8]> + 'c;
//     /// Return type of [`PDAGenerator::seeds_to_strings`]
//     type SeedsToStringsIter: Iterator<Item = String> + 'a;
//     /// Return type of [`PDAGenerator::seeds_to_strings_with_nonce`]
//     type SeedsToStringsWithNonceIter: Iterator<Item = String> + 'a;
//
//     /// Gets the seeds as an iterator of bytes
//     fn seeds_to_bytes(&'a self) -> Self::SeedsToBytesIter;
//     /// Gets the seeds as an iterator of bytes with an additional nonce
//     fn seeds_to_bytes_with_nonce(&'a self, nonce: &'b [u8; 1]) -> Self::SeedsToBytesWithNonceIter;
//     /// Gets the seeds as an iterator of strings
//     fn seeds_to_strings(&'a self) -> Self::SeedsToStringsIter;
//     /// Gets the seeds as an iterator of strings with an additional nonce
//     fn seeds_to_strings_with_nonce(&'a self, nonce: u8) -> Self::SeedsToStringsWithNonceIter;
//     /// Finds an address for the given seeds returning `(key, nonce)`
//     fn find_address(&self, program_id: &Pubkey) -> (Pubkey, u8);
//     /// Creates an address from given seeds and nonce, ~50% chance to error if given a random nonce
//     fn create_address(&self, program_id: &Pubkey, nonce: u8) -> Result<Pubkey>;
//     /// Verifies that a given address is derived from given seeds and finds nonce. Returns the found nonce.
//     fn verify_address_find_nonce(&self, program_id: &Pubkey, address: &Pubkey)
//         -> Result<u8>;
//     /// Verifies that a given address is derived from given seeds and nonce.
//     fn verify_address_with_nonce(
//         &self,
//         program_id: &Pubkey,
//         address: &Pubkey,
//         nonce: u8,
//     ) -> Result<()>;
//     /// Verifies that a given address is derived from given seeds.
//     fn verify_address(&self, program_id: &Pubkey, address: &Pubkey) -> Result<()>;
// }
// #[allow(clippy::type_complexity)]
// impl<'a, 'b, 'c, T: ?Sized> PDAGenerator<'a, 'b, 'c> for T
// where
//     T: PDASeeder,
//     'a: 'c,
//     'b: 'c,
// {
//     type SeedsToBytesIter =
//         Map<Box<dyn Iterator<Item = &'a dyn PDASeed> + 'a>, fn(&'a (dyn PDASeed + 'a)) -> &'a [u8]>;
//     type SeedsToBytesWithNonceIter = Chain<
//         Map<Box<dyn Iterator<Item = &'c dyn PDASeed> + 'c>, fn(&'c (dyn PDASeed + 'c)) -> &'c [u8]>,
//         Once<&'c [u8]>,
//     >;
//     type SeedsToStringsIter =
//         Map<Box<dyn Iterator<Item = &'a dyn PDASeed> + 'a>, fn(&'a (dyn PDASeed + 'a)) -> String>;
//     type SeedsToStringsWithNonceIter = Chain<
//         Map<Box<dyn Iterator<Item = &'a dyn PDASeed> + 'a>, fn(&'a (dyn PDASeed + 'a)) -> String>,
//         Once<String>,
//     >;
//
//     fn seeds_to_bytes(&'a self) -> Self::SeedsToBytesIter {
//         self.seeds().map(AsRef::as_ref)
//     }
//
//     fn seeds_to_bytes_with_nonce(&'a self, nonce: &'b [u8; 1]) -> Self::SeedsToBytesWithNonceIter {
//         self.seeds_to_bytes().chain(once(nonce as &[u8]))
//     }
//
//     fn seeds_to_strings(&'a self) -> Self::SeedsToStringsIter {
//         self.seeds().map(PDASeed::to_seed_string)
//     }
//
//     fn seeds_to_strings_with_nonce(&'a self, nonce: u8) -> Self::SeedsToStringsWithNonceIter {
//         self.seeds_to_strings().chain(once(nonce.to_string()))
//     }
//
//     fn find_address(&self, program_id: &Pubkey) -> (Pubkey, u8) {
//         let seed_bytes = self.seeds_to_bytes().collect::<Vec<_>>();
//         Pubkey::find_program_address(&seed_bytes, program_id)
//     }
//
//     fn create_address(&self, program_id: &Pubkey, nonce: u8) -> Result<Pubkey> {
//         Pubkey::create_program_address(
//             &self.seeds_to_bytes_with_nonce(&[nonce]).collect::<Vec<_>>(),
//             program_id,
//         )
//         .map_err(|error| match error {
//             PubkeyError::InvalidSeeds => CryptidError::NoAccountFromSeeds
//             .into(),
//             error => error.into(),
//         })
//     }
//
//     fn verify_address_find_nonce(
//         &self,
//         program_id: &Pubkey,
//         address: &Pubkey,
//     ) -> Result<u8> {
//         let (key, nonce) = self.find_address(program_id);
//         if address != &key {
//             return Err(CryptidError::AccountNotFromSeeds.into());
//         }
//         Ok(nonce)
//     }
//
//     fn verify_address_with_nonce(
//         &self,
//         program_id: &Pubkey,
//         address: &Pubkey,
//         nonce: u8,
//     ) -> Result<()> {
//         let created_key = self.create_address(program_id, nonce);
//         if created_key.is_err() || address != &created_key? {
//             Err(CryptidError::AccountNotFromSeeds.into())
//         } else {
//             Ok(())
//         }
//     }
//
//     fn verify_address(&self, program_id: &Pubkey, address: &Pubkey) -> Result<()> {
//         let created_key = self.find_address(program_id).0;
//         if address != &created_key {
//             return Err(CryptidError::AccountNotFromSeeds.into());
//         }
//         Ok(())
//     }
// }
