extern crate core;

use anchor_lang::prelude::*;
use cryptid::cpi::accounts::ApproveExecution;
use cryptid::program::Cryptid;
use cryptid::state::transaction_account::TransactionAccount;

declare_id!("midcHDoZsxvMmNtUr8howe8MWFrJeHHPbAyJF1nHvyf");

#[program]
pub mod check_recipient {
    use super::*;

    pub fn create(ctx: Context<Create>, recipient: Pubkey, nonce: u8, bump: u8) -> Result<()> {
        ctx.accounts.middleware_account.recipient = recipient;
        ctx.accounts.middleware_account.authority = *ctx.accounts.authority.key;
        ctx.accounts.middleware_account.nonce = nonce;
        ctx.accounts.middleware_account.bump = bump;
        Ok(())
    }

    pub fn execute_middleware(ctx: Context<ExecuteMiddleware>) -> Result<()> {
        let transaction_account = &ctx.accounts.transaction_account;

        // there can only be one instruction
        require!(
            transaction_account.instructions.len() == 1,
            ErrorCode::MultipleInstructions
        );

        let instruction = &transaction_account.instructions[0];

        // the instruction should be against the system program
        transaction_account
            .check_account(instruction.program_id, &System::id())
            .map_err(|_| ErrorCode::InvalidProgram)?;

        // Check the transaction is a transfer
        require_eq!(
            instruction.data[0],
            ExecuteMiddleware::TRANSFER_INSTRUCTION_INDEX,
            ErrorCode::InvalidInstructionType
        );

        // check that the recipient is the correct recipient
        transaction_account
            .check_account(
                instruction.accounts.get(1).unwrap().key,
                &ctx.accounts.middleware_account.recipient,
            )
            .map_err(|_| ErrorCode::InvalidRecipient)?;

        ExecuteMiddleware::approve(ctx)
    }
}

#[derive(Accounts)]
#[instruction(
/// The recipient that the middleware will allow transactions to be sent to
recipient: Pubkey,
/// The nonce for the middleware signer
nonce: u8,
/// The bump seed for the middleware signer
bump: u8
)]
pub struct Create<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + CheckRecipient::MAX_SIZE,
        seeds = [CheckRecipient::SEED_PREFIX, authority.key().as_ref(), nonce.to_le_bytes().as_ref()],
        bump,
    )]
    pub middleware_account: Account<'info, CheckRecipient>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteMiddleware<'info> {
    #[account()]
    pub middleware_account: Account<'info, CheckRecipient>,
    #[account(mut)]
    pub transaction_account: Account<'info, TransactionAccount>,
    pub cryptid_program: Program<'info, Cryptid>,
}
impl<'info> ExecuteMiddleware<'info> {
    /// The first byte of a transfer instruction is the instruction type
    /// as defined by the system program
    /// https://docs.rs/solana-sdk/1.4.9/solana_sdk/system_instruction/enum.SystemInstruction.html
    pub const TRANSFER_INSTRUCTION_INDEX: u8 = 2;

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
        let nonce = ctx.accounts.middleware_account.nonce.to_le_bytes();
        let bump = ctx.accounts.middleware_account.bump.to_le_bytes();
        let seeds = &[
            CheckRecipient::SEED_PREFIX,
            authority_key.as_ref(),
            nonce.as_ref(),
            bump.as_ref(),
        ][..];
        let signer = &[seeds][..];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        cryptid::cpi::approve_execution(cpi_ctx)
    }
}

#[account()]
pub struct CheckRecipient {
    pub recipient: Pubkey,
    pub authority: Pubkey,
    pub nonce: u8,
    pub bump: u8,
}
impl CheckRecipient {
    pub const SEED_PREFIX: &'static [u8] = b"check_recipient";

    pub const MAX_SIZE: usize = 32 + 32 + 1 + 1;
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
