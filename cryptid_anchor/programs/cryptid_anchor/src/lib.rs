extern crate core;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

pub mod error;
pub mod state;
pub mod util;
pub mod instructions;

use anchor_lang::prelude::*;
use instructions::direct_execute::{DirectExecute, direct_execute as call_direct_execute, DirectExecuteFlags};
use state::instruction_data::InstructionData;

#[program]
pub mod cryptid_anchor {
    use super::*;

    // pub fn direct_execute<'info>(
    //     ctx: Context<'info, 'info, 'info, 'info, DirectExecute<'info>>,
    //     controller_chain: Vec<u8>,
    //     instructions: Vec<InstructionData>,
    //     flags: DirectExecuteFlags
    // ) -> Result<()> {
    //     call_direct_execute(ctx, controller_chain, instructions, flags)
    // }
}
