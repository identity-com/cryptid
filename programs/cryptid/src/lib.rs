#![allow(clippy::result_large_err)]
#![allow(clippy::too_many_arguments)]
extern crate core;

#[macro_use]
extern crate enum_display_derive;

declare_id!("cryptJTh61jY5kbUmBEXyc86tBUyueBDrLuNSZWmUcs");

pub mod error;
pub mod instructions;
pub mod state;
pub mod util;

use anchor_lang::prelude::*;
use instructions::*;
use state::abbreviated_instruction_data::AbbreviatedInstructionData;
use state::did_reference::DIDReference;
use state::transaction_state::TransactionState;

#[program]
pub mod cryptid {
    use super::*;

    pub fn create_cryptid_account(
        ctx: Context<CreateCryptidAccount>,
        middleware: Option<Pubkey>,
        superuser_middlewares: Vec<Pubkey>,
        controller_chain: Vec<Pubkey>,
        index: u32,
        did_account_bump: u8,
    ) -> Result<()> {
        instructions::create_cryptid_account(
            ctx,
            middleware,
            superuser_middlewares,
            controller_chain,
            index,
            did_account_bump,
        )
    }

    pub fn direct_execute<'info>(
        ctx: Context<'_, '_, '_, 'info, DirectExecute<'info>>,
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

    pub fn propose_transaction<'info>(
        ctx: Context<'_, '_, '_, 'info, ProposeTransaction<'info>>,
        controller_chain: Vec<DIDReference>,
        cryptid_account_bump: u8,
        cryptid_account_index: u32,
        did_account_bump: u8,
        state: TransactionState,
        allow_unauthorized: bool,
        whitelisted_middleware_programs: Vec<Pubkey>,
        instructions: Vec<AbbreviatedInstructionData>,
        _num_accounts: u8,
    ) -> Result<()> {
        instructions::propose_transaction(
            ctx,
            controller_chain,
            cryptid_account_bump,
            cryptid_account_index,
            did_account_bump,
            state,
            allow_unauthorized,
            whitelisted_middleware_programs,
            instructions,
        )
    }

    pub fn extend_transaction<'info>(
        ctx: Context<'_, '_, '_, 'info, ExtendTransaction<'info>>,
        controller_chain: Vec<DIDReference>,
        cryptid_account_bump: u8,
        cryptid_account_index: u32,
        did_account_bump: u8,
        state: TransactionState,
        instructions: Vec<AbbreviatedInstructionData>,
        _num_accounts: u8,
    ) -> Result<()> {
        instructions::extend_transaction(
            ctx,
            controller_chain,
            cryptid_account_bump,
            cryptid_account_index,
            did_account_bump,
            state,
            instructions,
        )
    }

    pub fn execute_transaction<'info>(
        ctx: Context<'_, '_, '_, 'info, ExecuteTransaction<'info>>,
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

    pub fn close_transaction<'info>(
        ctx: Context<'_, '_, '_, 'info, CloseTransaction<'info>>,
        controller_chain: Vec<DIDReference>,
        cryptid_account_bump: u8,
        cryptid_account_index: u32,
        did_account_bump: u8,
    ) -> Result<()> {
        instructions::close_transaction(
            ctx,
            controller_chain,
            cryptid_account_bump,
            cryptid_account_index,
            did_account_bump,
        )
    }

    pub fn approve_execution<'info>(
        ctx: Context<'_, '_, '_, 'info, ApproveExecution<'info>>,
    ) -> Result<()> {
        instructions::approve_execution(ctx)
    }

    pub fn superuser_approve_execution<'info>(
        ctx: Context<'_, '_, '_, 'info, SuperuserApproveExecution<'info>>,
    ) -> Result<()> {
        instructions::superuser_approve_execution(ctx)
    }
}
