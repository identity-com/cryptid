//! Contains all the entrypoint functions to start a program.

use crate::{AccountInfo, GeneratorResult};
use solana_program::entrypoint::SUCCESS;
use solana_program::msg;
use solana_program::pubkey::Pubkey;

pub use solana_program::custom_heap_default;
pub use solana_program::custom_panic_default;

/// The entrypoint macro, replaces [`solana_program::entrypoint`](::solana_program::entrypoint) macro.
#[macro_export]
macro_rules! entrypoint {
    ($process_instruction:ident) => {
        $crate::entrypoint!($process_instruction, no_heap, no_panic);
        $crate::entrypoint::custom_heap_default!();
        $crate::entrypoint::custom_panic_default!();
    };
    ($process_instruction:ident, no_heap) => {
        $crate::entrypoint!($process_instruction, no_heap, no_panic);
        $crate::entrypoint::custom_panic_default!();
    };
    ($process_instruction:ident, no_panic) => {
        $crate::entrypoint!($process_instruction, no_heap, no_panic);
        $crate::entrypoint::custom_heap_default!();
    };
    ($process_instruction:ident, no_heap, no_panic) => {
        /// # Safety
        /// This function should not be called by rust code
        #[no_mangle]
        pub unsafe extern "C" fn entrypoint(input: *mut u8) -> u64 {
            $crate::entrypoint::entry(input, $process_instruction)
        }
    };
}

/// This function can be called if the [`entrypoint`] macro can't be used.
/// It is designed to deserialize into the custom [`AccountInfo`] structs and run a given function returning the error code.
///
/// # Safety
/// This must be called with the input from `pub unsafe extern "C" fn entrypoint`
pub unsafe fn entry(
    input: *mut u8,
    function: impl FnOnce(Pubkey, Vec<AccountInfo>, &[u8]) -> GeneratorResult<()>,
) -> u64 {
    let (program_id, accounts, instruction_data) = AccountInfo::deserialize(input);
    match function(program_id, accounts, instruction_data) {
        Ok(()) => SUCCESS,
        Err(error) => {
            msg!("Error: {}", error.message());
            error.to_program_error().into()
        }
    }
}
