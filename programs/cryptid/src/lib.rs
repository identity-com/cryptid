extern crate core;

declare_id!("cryptJTh61jY5kbUmBEXyc86tBUyueBDrLuNSZWmUcs");

pub mod error;
pub mod instructions;
pub mod state;
pub mod util;

use crate::state::abbreviated_instruction_data::AbbreviatedInstructionData;
use anchor_lang::prelude::*;
use instructions::*;

#[program]
pub mod cryptid {
    use super::*;
    pub use instructions::ApproveExecution;

    pub fn create(
        ctx: Context<Create>,
        middleware: Option<Pubkey>,
        index: u32,
        bump: u8,
    ) -> Result<()> {
        instructions::create(ctx, middleware, index, bump)
    }

    pub fn direct_execute<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, DirectExecute<'info>>,
        controller_chain: Vec<u8>,
        instructions: Vec<AbbreviatedInstructionData>,
        cryptid_account_bump: u8,
        flags: u8,
    ) -> Result<()> {
        instructions::direct_execute(
            ctx,
            controller_chain,
            instructions,
            cryptid_account_bump,
            flags,
        )
    }

    pub fn propose_transaction<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ProposeTransaction<'info>>,
        instructions: Vec<AbbreviatedInstructionData>,
        _num_accounts: u8,
    ) -> Result<()> {
        instructions::propose_transaction(ctx, instructions)
    }

    pub fn execute_transaction<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ExecuteTransaction<'info>>,
        controller_chain: Vec<u8>,
        cryptid_account_bump: u8,
        flags: u8,
    ) -> Result<()> {
        instructions::execute_transaction(ctx, controller_chain, cryptid_account_bump, flags)
    }

    pub fn approve_execution<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ApproveExecution<'info>>,
    ) -> Result<()> {
        instructions::approve_execution(ctx)
    }
}
