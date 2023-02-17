use crate::error::CryptidError;
use crate::state::transaction_account::TransactionAccount;
use crate::state::transaction_state::TransactionState;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ApproveExecution<'info> {
    pub middleware_account: Signer<'info>,
    #[account(
        mut,
        // ensure the transaction is not approved until it is ready to be approved, and is not executed
        constraint = transaction_account.state == TransactionState::Ready @ CryptidError::InvalidTransactionState,
    )]
    pub transaction_account: Account<'info, TransactionAccount>,
}

/// Executes a transaction directly if all required keys sign
pub fn approve_execution<'info>(
    ctx: Context<'_, '_, '_, 'info, ApproveExecution<'info>>,
) -> Result<()> {
    // Make sure owner is NOT the System Program
    // TODO(ticket): Consider implementing an approval registry on middleware
    require!(
        !anchor_lang::solana_program::system_program::check_id(
            ctx.accounts.middleware_account.owner
        ),
        CryptidError::InvalidMiddlewareAccount
    );

    msg!(
        "Transaction approved by middleware owned by program: {}",
        ctx.accounts.middleware_account.owner
    );
    ctx.accounts.transaction_account.approved_middleware =
        Some(*ctx.accounts.middleware_account.key);

    Ok(())
}
