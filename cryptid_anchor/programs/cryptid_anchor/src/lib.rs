extern crate core;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

pub mod error;
pub mod state;
pub mod util;
pub mod instructions;

use anchor_lang::prelude::*;
use instructions::*;
use state::instruction_data::InstructionData;

#[program]
pub mod cryptid_anchor {
    use super::*;

    pub fn direct_execute<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, DirectExecute<'info>>,
        controller_chain: Vec<u8>,
        instructions: Vec<InstructionData>,
        signer_bump: u8,
        flags: u8
    ) -> Result<()> {
        instructions::direct_execute(ctx, controller_chain, instructions, signer_bump, flags)
    }
}

