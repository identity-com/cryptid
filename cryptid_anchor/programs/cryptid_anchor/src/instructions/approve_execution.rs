use crate::state::transaction_account::TransactionAccount;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ApproveExecution<'info> {
    pub middleware_account: Signer<'info>,
    #[account(mut)]
    pub transaction_account: Account<'info, TransactionAccount>,
}

/// Executes a transaction directly if all required keys sign
pub fn approve_execution<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, ApproveExecution<'info>>,
) -> Result<()> {
    // TODO enforce that the middleware account belongs to an approved middleware program?
    msg!(
        "Transaction approved by middleware owned by program: {}",
        ctx.accounts.middleware_account.owner
    );
    ctx.accounts.transaction_account.approved_middleware =
        Some(*ctx.accounts.middleware_account.key);

    Ok(())
}
