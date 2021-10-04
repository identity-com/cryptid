#![warn(unused_import_braces, unused_imports)]

extern crate proc_macro;

mod account;
mod account_argument;
mod error;
mod instruction_list;

use crate::account::AccountDerive;
use crate::account_argument::AccountArgumentDerive;
use crate::error::ErrorDerive;
use crate::instruction_list::InstructionListDerive;
use proc_macro::TokenStream;
use proc_macro_error::proc_macro_error;
use syn::parse_macro_input;

#[proc_macro_derive(Account, attributes(account))]
pub fn derive_account(ts: TokenStream) -> TokenStream {
    let stream = parse_macro_input!(ts as AccountDerive).into_token_stream();
    #[cfg(feature = "debug_account")]
    {
        println!("{}", stream);
        std::thread::sleep(std::time::Duration::from_millis(100));
    }
    stream.into()
}

/// If no start specified starts at `300`
#[proc_macro_error]
#[proc_macro_derive(Error, attributes(error, error_msg))]
pub fn derive_error(ts: TokenStream) -> TokenStream {
    let stream = parse_macro_input!(ts as ErrorDerive).into_token_stream();
    #[cfg(feature = "debug_error")]
    {
        println!("{}", stream);
        std::thread::sleep(std::time::Duration::from_millis(100));
    }
    stream.into()
}

/// The derive macro is implemented for structs only. Each field must implement [`AccountArgument`].
///
/// ## Struct Macros
/// The struct macro is `account_argument` and contains a comma seperated list of arguments.
/// ex:
/// ```
/// use solana_generator::AccountArgument;
/// #[derive(AccountArgument)]
/// #[account_argument(instruction_data = (size: usize))]
///  pub struct ArgumentAccounts{}
/// ```
/// ### `instruction_data`
/// format: `instruction_data = ($($name:ident: $ty:ty,)*)`
///
/// This is the types (`$ty`) that the [`InstructionArg`](AccountArgument::InstructionArg) tuple will be created from and the names (`$name`) that can be used to access them.
///
/// ## Field Macros
/// The field macro is `account_argument` and contains a comma seperated list of arguments.
/// These arguments can access the top level `instruction_data` by name.
/// ex:
/// ```
/// use solana_generator::{AccountInfo, AccountArgument};
/// #[derive(AccountArgument)]
///  pub struct ArgumentAccounts{
///      #[account_argument(signer, writable)]
///      account: AccountInfo,
///  }
/// ```
///
/// ### `signer`, `writable`, and `owner`
/// format: `$(signer|writable|owner)$(($optional_index:expr))? $(= $owner:expr)?
///
/// Requires the argument implement [`MultiIndexableAccountArgument`].
/// These allow restrictions to be added to the arguments they are added to.
/// `signer` verifies that the index is a signer
/// `writable` verifies that the index is writable
/// `owner` verifies that the index's owner is `$owner`. This is the only valid argument with `$owner`
///
/// `$optional_index` is an optional index (type `T`) where the argument must implement [`MultiIndexableAccountArgument<T>`].
/// Defaults to [`All`](crate::All)
///
/// ### `instruction_data`
/// format: `instruction_data = $data:expr`
///
/// This is optional and allows the setting of the [`InstructionArg`](AccountArgument::InstructionArg) passed to this field.
/// If not used calls [`Default::default`] instead.
#[proc_macro_error]
#[proc_macro_derive(AccountArgument, attributes(account_argument))]
pub fn derive_account_argument(ts: TokenStream) -> TokenStream {
    let stream = parse_macro_input!(ts as AccountArgumentDerive).into_token_stream();
    #[cfg(feature = "debug_account_argument")]
    {
        println!("{}", stream);
        std::thread::sleep(std::time::Duration::from_millis(100));
    }
    stream.into()
}

#[proc_macro_error]
#[proc_macro_derive(InstructionList, attributes(instruction_list))]
pub fn derive_instruction_list(ts: TokenStream) -> TokenStream {
    let stream = parse_macro_input!(ts as InstructionListDerive).into_token_stream();
    #[cfg(feature = "debug_instruction_list")]
    {
        println!("{}", stream);
        std::thread::sleep(std::time::Duration::from_millis(100));
    }
    stream.into()
}
