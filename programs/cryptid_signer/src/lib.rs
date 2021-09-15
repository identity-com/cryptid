#![warn(unused_import_braces, missing_debug_implementations)]

mod entry;
mod error;
mod instruction;
mod processor;
mod state;

pub const DOA_SIGNER_SEED: &[u8] = b"doa_signer";
