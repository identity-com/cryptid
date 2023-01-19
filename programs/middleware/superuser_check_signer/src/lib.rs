#![allow(clippy::result_large_err)]
extern crate core;

use anchor_lang::prelude::*;
use cryptid::cpi::accounts::SuperuserApproveExecution;
use cryptid::error::CryptidError;
use cryptid::program::Cryptid;
use cryptid::state::cryptid_account::CryptidAccount;
use cryptid::state::transaction_account::TransactionAccount;

declare_id!("midsEy2qfSX1gguxZT3Kv4dGTDisi7iDMAJfSmyG5Y9");

#[program]
pub mod superuser_check_signer {
    use super::*;

    pub fn create(
        ctx: Context<Create>,
        signer: Pubkey,
        bump: u8,
        previous_middleware: Option<Pubkey>,
    ) -> Result<()> {
        ctx.accounts.middleware_account.signer = signer;
        ctx.accounts.middleware_account.authority = *ctx.accounts.authority.key;
        ctx.accounts.middleware_account.bump = bump;
        ctx.accounts.middleware_account.previous_middleware = previous_middleware;
        Ok(())
    }

    /// execute the middleware - checking that any previous middleware have been executed
    /// Note- there is no additional check needed here - the signer check is already verified
    /// by anchor.
    pub fn execute_middleware(ctx: Context<ExecuteMiddleware>) -> Result<()> {
        msg!("Set signer: {}", ctx.accounts.middleware_account.signer);
        msg!("Passed signer: {}", ctx.accounts.signer.key);

        // Check the previous middleware has passed the transaction
        if let Some(required_previous_middleware) =
            ctx.accounts.middleware_account.previous_middleware
        {
            match ctx.accounts.transaction_account.approved_middleware {
                None => err!(CryptidError::IncorrectMiddleware),
                Some(approved_previous_middleware) => {
                    require_keys_eq!(
                        required_previous_middleware,
                        approved_previous_middleware,
                        CryptidError::IncorrectMiddleware
                    );
                    Ok(())
                }
            }?;
        }
        ExecuteMiddleware::approve(ctx)
    }
}

#[derive(Accounts)]
#[instruction(
/// The signer that the middleware will allow to sign a transaction, bypassing the DID key check
signer: Pubkey,
/// The bump seed for the middleware pda
bump: u8,
/// The previous middleware account, if any.
previous_middleware: Option<Pubkey>
)]
pub struct Create<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + SuperuserCheckSigner::MAX_SIZE,
        seeds = [
            SuperuserCheckSigner::SEED_PREFIX,
            authority.key().as_ref(),
            signer.as_ref(),
            previous_middleware.as_ref().map(|p| p.as_ref()).unwrap_or(&[0u8; 32])
        ],
        bump,
    )]
    pub middleware_account: Account<'info, SuperuserCheckSigner>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteMiddleware<'info> {
    #[account(
        has_one = signer @ ErrorCode::InvalidSigner
    )]
    pub middleware_account: Account<'info, SuperuserCheckSigner>,
    #[account(
        mut,
        has_one = cryptid_account,
    )]
    pub transaction_account: Account<'info, TransactionAccount>,
    pub cryptid_account: Account<'info, CryptidAccount>,
    pub signer: Signer<'info>,
    pub cryptid_program: Program<'info, Cryptid>,
}
impl<'info> ExecuteMiddleware<'info> {
    // TODO abstract this into shared?
    pub fn approve(ctx: Context<ExecuteMiddleware>) -> Result<()> {
        let cpi_program = ctx.accounts.cryptid_program.to_account_info();
        let cpi_accounts = SuperuserApproveExecution {
            middleware_account: ctx.accounts.middleware_account.to_account_info(),
            transaction_account: ctx.accounts.transaction_account.to_account_info(),
            cryptid_account: ctx.accounts.cryptid_account.to_account_info(),
        };
        // define seeds inline here rather than extract to a function
        // in order to avoid having to convert Vec<Vec<u8>> to &[&[u8]]
        let authority_key = ctx.accounts.middleware_account.authority.key();
        let signer = ctx.accounts.middleware_account.signer.key();
        let previous_middleware = ctx
            .accounts
            .middleware_account
            .previous_middleware
            .as_ref()
            .map(|p| p.as_ref())
            .unwrap_or(&[0u8; 32]);
        let bump = ctx.accounts.middleware_account.bump.to_le_bytes();
        let seeds = &[
            SuperuserCheckSigner::SEED_PREFIX,
            authority_key.as_ref(),
            signer.as_ref(),
            previous_middleware,
            bump.as_ref(),
        ][..];
        let signer = &[seeds][..];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        cryptid::cpi::superuser_approve_execution(cpi_ctx)
    }
}

#[account()]
pub struct SuperuserCheckSigner {
    pub signer: Pubkey,
    pub authority: Pubkey,
    pub bump: u8,
    /// The previous middleware in the chain, if any
    pub previous_middleware: Option<Pubkey>,
}
impl SuperuserCheckSigner {
    pub const SEED_PREFIX: &'static [u8] = b"superuser_check_signer";

    pub const MAX_SIZE: usize = 32 + 32 + 1 + (1 + 32);
}

#[error_code]
pub enum ErrorCode {
    #[msg("The middleware execution was signed by the wrong signer")]
    InvalidSigner,
}
