use crate::error::CryptidError;
use crate::state::transaction_account::TransactionAccount;
use crate::state::transaction_state::TransactionState;
use anchor_lang::prelude::*;
use crate::state::cryptid_account::CryptidAccount;

#[derive(Accounts)]
pub struct SuperuserApproveExecution<'info> {
    pub middleware_account: Signer<'info>,
    #[account(
        mut,
        // ensure the transaction is not approved until it is ready to be approved, and is not executed
        constraint = transaction_account.state == TransactionState::Ready @ CryptidError::InvalidTransactionState,
        has_one = cryptid_account,
        constraint = transaction_account.authorized == false,
    )]
    pub transaction_account: Account<'info, TransactionAccount>,
    #[account(
        constraint = cryptid_account.superuser_middleware.contains(&middleware_account.key) @ CryptidError::IncorrectSuperuserMiddleware,
    )]
    pub cryptid_account: Account<'info, CryptidAccount>,
}

pub fn superuser_approve_execution<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, SuperuserApproveExecution<'info>>,
) -> Result<()> {
    // TODO enforce that the middleware account belongs to an approved middleware program?
    msg!(
        "Transaction approved by middleware owned by program: {}",
        ctx.accounts.middleware_account.owner
    );
    ctx.accounts.transaction_account.approved_middleware =
        Some(*ctx.accounts.middleware_account.key);

    // TODO allow multiple superuser middlewares and require all to approve it.
    ctx.accounts.transaction_account.authorized = true;

    Ok(())
}
