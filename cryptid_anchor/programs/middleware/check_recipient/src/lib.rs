extern crate core;

use anchor_lang::prelude::*;
use cryptid_anchor::state::transaction_account::TransactionAccount;
use cryptid_anchor::program::CryptidAnchor;

declare_id!("midcHDoZsxvMmNtUr8howe8MWFrJeHHPbAyJF1nHvyf");

#[program]
pub mod check_recipient {
    use anchor_lang::solana_program::program_utils::limited_deserialize;
    use anchor_lang::solana_program::system_instruction::SystemInstruction;
    use cryptid_anchor::cpi::accounts::ApproveExecution;
    use super::*;

    pub fn execute(ctx: Context<Execute>) -> Result<()> {
        let transaction_account = &ctx.accounts.transaction_account;

        // there can only be one instruction
        require!(transaction_account.instructions.len() == 1, ErrorCode::MultipleInstructions);

        let instruction = &transaction_account.instructions[0];

        // the instruction should be against the system program
        require!(transaction_account.accounts[instruction.program_id as usize] == System::id(), ErrorCode::InvalidProgram);

        // attempt to parse the tx into a transfer instruction
        // Transfer is a system instruction which uses bincode for serialization
        // We could also simply manually parse it here as it is a very simple instruction, and we are only
        // interested in the first byte anyway
        let deserialized_instruction = limited_deserialize(&instruction.data, 1 + 8).map_err(|_| ErrorCode::InvalidInstructionType)?;
        match deserialized_instruction {
            SystemInstruction::Transfer { lamports: _ } => {}
            _ => return Err(ErrorCode::InvalidInstructionType.into()),
        }

            // .map_err(|_| ErrorCode::InvalidInstructionType)?;
            // AccountDeserialize::try_from_slice(instruction.data.as_slice()).map_err(|_| ErrorCode::InvalidInstructionType)?;

        // check that the recipient is the correct recipient
        require_keys_eq!(transaction_account.accounts[instruction.accounts.get(1).unwrap().key as usize], ctx.accounts.middleware_account.recipient, ErrorCode::InvalidRecipient);

        // TODO abstract this into shared
        let cpi_program = ctx.accounts.cryptid_program.to_account_info();
        let cpi_accounts = ApproveExecution {
            middleware_account: ctx.accounts.middleware_account.to_account_info(),
            transaction_account: ctx.accounts.transaction_account.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        cryptid_anchor::cpi::approve_execution(cpi_ctx)
    }
}

#[derive(Accounts)]
pub struct Execute<'info> {
    #[account()]
    pub middleware_account: Account<'info, CheckRecipient>,
    #[account()]
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