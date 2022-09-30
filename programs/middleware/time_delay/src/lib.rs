// This is a simple permissionless safety mechanism that can be added to a cryptid account.
//
// It protects, for example, against attacks that trick a user into signing a transaction to move funds out of their cryptid account. The transaction can be created, but the attacker must trick a user a second time, some time later, to execute the transaction.
//
// This is an example of a middleware that has its own transaction-level state, indicating the time at which the tx was initially created. The flow for a transaction using this middleware is therefore:
//
// Cryptid.propose -> create the tx
// Middleware.registerTransaction -> register the creation time with the middleware
// <<wait>>
// Middleware.execute -> approves the transaction if enough time has passed
// Cryptid.execute -> executes the transaction

extern crate core;

use anchor_lang::prelude::*;
use cryptid::cpi::accounts::ApproveExecution;
use cryptid::error::CryptidError;
use cryptid::program::Cryptid;
use cryptid::state::transaction_account::TransactionAccount;

declare_id!("midttN2h6G2CBvt1kpnwUsFXM6Gv7gratVwuo2XhSNk");

#[program]
pub mod time_delay {
    use super::*;

    pub fn create(
        ctx: Context<Create>,
        seconds: i64,
        bump: u8,
        previous_middleware: Option<Pubkey>,
    ) -> Result<()> {
        ctx.accounts.middleware_account.authority = *ctx.accounts.authority.key;
        ctx.accounts.middleware_account.seconds = seconds;
        ctx.accounts.middleware_account.bump = bump;
        ctx.accounts.middleware_account.previous_middleware = previous_middleware;
        Ok(())
    }

    pub fn register_transaction(ctx: Context<RegisterTransaction>) -> Result<()> {
        ctx.accounts.transaction_create_time.time = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn execute_middleware(
        ctx: Context<ExecuteMiddleware>,
        _transaction_create_time_bump: u8,
    ) -> Result<()> {
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

        let transaction_create_time = &ctx.accounts.transaction_create_time;
        let middleware_account = &ctx.accounts.middleware_account;

        let current_time = Clock::get()?.unix_timestamp;
        let earliest_allowable_time = transaction_create_time.time + middleware_account.seconds;

        require_gte!(current_time, earliest_allowable_time, ErrorCode::TooSoon);

        ExecuteMiddleware::approve(ctx)
    }
}

#[derive(Accounts)]
#[instruction(
/// The number of seconds that must pass before the transaction can be executed
seconds: i64,
/// The bump seed for the middleware signer
bump: u8,
/// The previous middleware account, if any.
previous_middleware: Option<Pubkey>
)]
pub struct Create<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + TimeDelay::MAX_SIZE,
        seeds = [
            TimeDelay::SEED_PREFIX,
            authority.key().as_ref(),
            &seconds.to_le_bytes(),
            previous_middleware.as_ref().map(|p| p.as_ref()).unwrap_or(&[0u8; 32])
        ],
        bump,
    )]
    pub middleware_account: Account<'info, TimeDelay>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterTransaction<'info> {
    #[account()]
    pub middleware_account: Account<'info, TimeDelay>,
    #[account()]
    pub transaction_account: Account<'info, TransactionAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + TransactionCreationTime::MAX_SIZE,
        seeds = [
            TransactionCreationTime::SEED_PREFIX,
            transaction_account.key().as_ref(),
        ],
        bump,
    )]
    pub transaction_create_time: Account<'info, TransactionCreationTime>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
/// The bump seed used to generate the transaction_create_time account
transaction_create_time_bump: u8
)]
pub struct ExecuteMiddleware<'info> {
    #[account()]
    pub middleware_account: Account<'info, TimeDelay>,
    #[account(mut)]
    pub transaction_account: Account<'info, TransactionAccount>,
    /// CHECK: Rent destination account does not need to satisfy the any constraints.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
    /// The account containing the transaction create time
    /// the current time must be after the one registered here
    #[account(
        mut,
        close = destination,
        seeds = [TransactionCreationTime::SEED_PREFIX, transaction_account.key().as_ref()],
        bump = transaction_create_time_bump,
    )]
    pub transaction_create_time: Account<'info, TransactionCreationTime>,
    pub cryptid_program: Program<'info, Cryptid>,
}
impl<'info> ExecuteMiddleware<'info> {
    // TODO abstract this into shared?
    pub fn approve(ctx: Context<ExecuteMiddleware>) -> Result<()> {
        let cpi_program = ctx.accounts.cryptid_program.to_account_info();
        let cpi_accounts = ApproveExecution {
            middleware_account: ctx.accounts.middleware_account.to_account_info(),
            transaction_account: ctx.accounts.transaction_account.to_account_info(),
        };
        // define seeds inline here rather than extract to a function
        // in order to avoid having to convert Vec<Vec<u8>> to &[&[u8]]
        let authority_key = ctx.accounts.middleware_account.authority.key();
        let seconds = ctx.accounts.middleware_account.seconds.to_le_bytes();
        let bump = ctx.accounts.middleware_account.bump.to_le_bytes();
        let seeds = &[
            TimeDelay::SEED_PREFIX,
            authority_key.as_ref(),
            seconds.as_ref(),
            ctx.accounts
                .middleware_account
                .previous_middleware
                .as_ref()
                .map(|p| p.as_ref())
                .unwrap_or(&[0u8; 32]),
            bump.as_ref(),
        ][..];
        let signer = &[seeds][..];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        cryptid::cpi::approve_execution(cpi_ctx)
    }
}

#[account()]
pub struct TimeDelay {
    pub authority: Pubkey,
    pub seconds: i64, // i64 to match the UnixTimestamp type
    pub bump: u8,
    /// The previous middleware in the chain, if any
    pub previous_middleware: Option<Pubkey>,
}
impl TimeDelay {
    pub const SEED_PREFIX: &'static [u8] = b"time_delay";

    pub const MAX_SIZE: usize = 32 + 8 + 1 + (1 + 32);
}

#[account()]
pub struct TransactionCreationTime {
    pub time: i64, // Matches UnixTimestamp, which is not supported by anchor idls at present
}
impl TransactionCreationTime {
    pub const SEED_PREFIX: &'static [u8] = b"time_delay_creation_time";

    pub const MAX_SIZE: usize = 8;
}

#[error_code]
pub enum ErrorCode {
    #[msg("The transaction cannot be executed yet")]
    TooSoon,
}
