extern crate core;

use anchor_lang::prelude::*;
use cryptid_anchor::state::transaction_account::TransactionAccount;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod check_recipient {
    use super::*;

    pub fn execute(ctx: Context<Execute>) -> Result<()> {
        let transaction_account = &ctx.accounts.transaction_account;

        require!(transaction_account.instructions.len() == 1, CryptidError::InvalidTransaction);

        // TODO abstract this into shared
        let cpi_program = ctx.accounts.cryptid_program.to_account_info();
        let cpi_accounts = SetData {
            transaction_account: ctx.accounts.transaction_account.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        puppet::cpi::set_data(cpi_ctx, data)
    }
}

#[derive(Accounts)]
pub struct Execute<'info> {
    #[account(mut)]
    pub middleware_account: Account<'info, CheckRecipient>,
    #[account]
    pub transaction_account: Account<'info, TransactionAccount>,
    pub cryptid_program: Program<'info, CryptidAnchor>,
}

#[account]
pub struct CheckRecipient {
    pub recipient: Pubkey
}

#[error_code]
pub enum ErrorCode {
    #[msg("This middleware requires that the transaction have only one instruction")]
    MultipleInstructions,

    #[msg("This middleware allows only transfer instructions from the system program")]
    InvalidProgram,

    #[msg("This middleware allows only transfer instructions")]
    InvalidInstructionType,

    #[msg("This middleware allows only transfers to the designated recipient")]
    InvalidRecipient,
}