#![warn(unused_import_braces, missing_debug_implementations)]

use solana_generator::{GeneratorError, GeneratorResult, Pubkey};

#[macro_use]
mod macros;

pub mod account;
mod entry;
pub mod error;
pub mod instruction;
pub mod state;

pub const DOA_SIGNER_SEED: &[u8] = b"doa_signer";

pub fn get_doa_signer(
    program_id: Pubkey,
    doa_key: Pubkey,
    doa_signer_nonce: u8,
) -> GeneratorResult<Pubkey> {
    Ok(Pubkey::create_program_address(
        doa_signer_seeds!(doa_key, doa_signer_nonce),
        &program_id,
    )?)
}
pub fn generate_doa_signer(program_id: Pubkey, doa: Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(doa_signer_seeds!(doa), &program_id)
}
// TODO: Move this seeds check to `solana_generator`
pub fn verify_doa_signer(
    program_id: Pubkey,
    doa_key: Pubkey,
    doa_signer: Pubkey,
    doa_signer_nonce: u8,
) -> GeneratorResult<()> {
    let seeds = doa_signer_seeds!(doa_key, doa_signer_nonce);

    if doa_signer != Pubkey::create_program_address(seeds, &program_id)? {
        Err(GeneratorError::AccountNotFromSeeds {
            account: doa_signer,
            seeds: format!("[\"doa_signer\", {}, [{}]]", doa_key, doa_signer_nonce),
            program_id,
        }
        .into())
    } else {
        Ok(())
    }
}
