#![deny(unused_import_braces, unused_imports)]

extern crate proc_macro;

mod account;
mod account_argument;
mod error;

use crate::account::AccountDerive;
use crate::account_argument::AccountArgumentDerive;
use crate::error::ErrorDerive;
use proc_macro::TokenStream;
use proc_macro_error::{emit_call_site_warning, proc_macro_error};
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
#[proc_macro_attribute]
pub fn program(_args: TokenStream, input: TokenStream) -> TokenStream {
    emit_call_site_warning!("`program` not yet implemented");
    input
}
