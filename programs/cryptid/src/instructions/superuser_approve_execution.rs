use crate::error::CryptidError;
use crate::state::cryptid_account::CryptidAccount;
use crate::state::transaction_account::TransactionAccount;
use crate::state::transaction_state::TransactionState;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct SuperuserApproveExecution<'info> {
    pub middleware_account: Signer<'info>,
    #[account(
        mut,
        // ensure the transaction is not approved until it is ready to be approved, and is not executed
        constraint = transaction_account.state == TransactionState::Ready @ CryptidError::InvalidTransactionState,
        has_one = cryptid_account,
        constraint = !transaction_account.authorized @ CryptidError::AlreadyAuthorizedTransactionAccount,
    )]
    pub transaction_account: Account<'info, TransactionAccount>,
    #[account(
        // This instruction can only be used if the CryptidAccount allows it.
        constraint = cryptid_account.superuser_middleware.contains(middleware_account.key) @ CryptidError::IncorrectSuperuserMiddleware,
    )]
    pub cryptid_account: Account<'info, CryptidAccount>,
}

pub fn superuser_approve_execution<'info>(
    ctx: Context<'_, '_, '_, 'info, SuperuserApproveExecution<'info>>,
) -> Result<()> {
    require!(
        ctx.accounts
            .transaction_account
            .whitelisted_middleware_programs
            .contains(ctx.accounts.middleware_account.owner),
        CryptidError::InvalidMiddlewareAccount
    );

    msg!(
        "Transaction approved by middleware owned by program: {}",
        ctx.accounts.middleware_account.owner
    );
    ctx.accounts.transaction_account.approved_middleware =
        Some(*ctx.accounts.middleware_account.key);

    // only the LAST superuser_middleware is able to authorize the transaction
    if ctx
        .accounts
        .cryptid_account
        .superuser_middleware
        .last()
        .unwrap()
        == ctx.accounts.middleware_account.key
    {
        ctx.accounts.transaction_account.authorized = true;
    }

    Ok(())
}
