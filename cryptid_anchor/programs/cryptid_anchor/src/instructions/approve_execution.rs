use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::log::sol_log_compute_units;
use anchor_lang::solana_program::program::invoke_signed;
use bitflags::bitflags;
use crate::state::cryptid_account::CryptidAccount;
use crate::state::abbreviated_instruction_data::{AbbreviatedInstructionData};
use crate::state::transaction_account::TransactionAccount;
use crate::util::*;
use crate::instructions::util::*;
use sol_did::state::DidAccount;
use crate::error::CryptidError;
use crate::util::seeder::*;


#[derive(Accounts)]
pub struct ApproveExecution<'info> {
    pub middleware_account: Signer<'info>,
    #[account(mut)]
    pub transaction_account: Account<'info, TransactionAccount>
}

/// Executes a transaction directly if all required keys sign
pub fn approve_execution<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, ApproveExecution<'info>>,
) -> Result<()> {
    // TODO enforce that the middleware account belongs to an approved middleware program?
    msg!("Transaction approved by middleware owned by program: {}", ctx.accounts.middleware_account.owner);
    ctx.accounts.transaction_account.approved_middleware = Some(*ctx.accounts.middleware_account.key);

    Ok(())
}
