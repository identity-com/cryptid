#![warn(unused_import_braces, missing_debug_implementations)]
//! A signer that supports did-interfaces for signing (rotatable multi-key)

#[macro_use]
mod macros;

pub mod account;
#[cfg(feature = "client")]
pub mod client;
pub mod error;
pub mod instruction;
pub mod seeds;
pub mod state;

#[cfg(all(not(feature = "no-entrypoint"), feature = "processor"))]
mod entry {
    use crate::instruction::CryptidInstruction;
    use cruiser::entrypoint_list;
    entrypoint_list!(CryptidInstruction, CryptidInstruction);
}
