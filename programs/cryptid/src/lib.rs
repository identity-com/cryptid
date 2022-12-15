#![allow(clippy::result_large_err)]
extern crate core;

declare_id!("cryptJTh61jY5kbUmBEXyc86tBUyueBDrLuNSZWmUcs");

pub mod error;
pub mod instructions;
pub mod state;
pub mod util;

use anchor_lang::prelude::*;
use instructions::*;
use state::abbreviated_instruction_data::AbbreviatedInstructionData;
use state::did_reference::DIDReference;

#[program]
pub mod cryptid {
    use super::*;
    pub use instructions::ApproveExecution;

    pub fn create(
        ctx: Context<Create>,
        middleware: Option<Pubkey>,
        controller_chain: Vec<Pubkey>,
        index: u32,
        did_account_bump: u8,
    ) -> Result<()> {
        instructions::create(ctx, middleware, controller_chain, index, did_account_bump)
    }

    pub fn direct_execute<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, DirectExecute<'info>>,
        controller_chain: Vec<DIDReference>,
        instructions: Vec<AbbreviatedInstructionData>,
        cryptid_account_bump: u8,
        cryptid_account_index: u32,
        did_account_bump: u8,
        flags: u8,
    ) -> Result<()> {
        instructions::direct_execute(
            ctx,
            controller_chain,
            instructions,
            cryptid_account_bump,
            cryptid_account_index,
            did_account_bump,
            flags,
        )
    }

    pub fn propose_transaction<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ProposeTransaction<'info>>,
        controller_chain: Vec<DIDReference>,
        cryptid_account_bump: u8,
        cryptid_account_index: u32,
        did_account_bump: u8,
        instructions: Vec<AbbreviatedInstructionData>,
        _num_accounts: u8,
    ) -> Result<()> {
        instructions::propose_transaction(
            ctx,
            controller_chain,
            cryptid_account_bump,
            cryptid_account_index,
            did_account_bump,
            instructions,
        )
    }

    pub fn execute_transaction<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ExecuteTransaction<'info>>,
        controller_chain: Vec<DIDReference>,
        cryptid_account_bump: u8,
        cryptid_account_index: u32,
        did_account_bump: u8,
        flags: u8,
    ) -> Result<()> {
        instructions::execute_transaction(
            ctx,
            controller_chain,
            cryptid_account_bump,
            cryptid_account_index,
            did_account_bump,
            flags,
        )
    }

    pub fn approve_execution<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ApproveExecution<'info>>,
    ) -> Result<()> {
        instructions::approve_execution(ctx)
    }
}
