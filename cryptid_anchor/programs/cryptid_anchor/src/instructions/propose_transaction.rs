use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::log::sol_log_compute_units;
use anchor_lang::solana_program::program::invoke_signed;
use bitflags::bitflags;
use crate::state::cryptid_account::CryptidAccount;
use crate::state::abbreviated_instruction_data::{AbbreviatedInstructionData};
use crate::util::*;
use crate::instructions::util::*;
use sol_did::state::DidAccount;
use crate::error::CryptidError;
use crate::state::transaction_account::TransactionAccount;
use crate::state::instruction_size::InstructionSize;
use crate::util::seeder::*;


#[derive(Accounts)]
#[instruction(
/// The instructions to execute
instructions: Vec<AbbreviatedInstructionData>,
num_accounts: u8
)]
pub struct ProposeTransaction<'info> {
    /// The Cryptid instance that can execute the transaction.
    /// CHECK: This assumes a purely generative case until we have use-cases that require a state.
    #[account()]
    pub cryptid_account: UncheckedAccount<'info>,    // TODO allow generative/non-generative
    #[account(mut)]
    authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = TransactionAccount::calculate_size(
            num_accounts.into(),
            InstructionSize::from_iter_to_iter(
                instructions.iter()
            )
        ).into())
    ]
    transaction_account: Account<'info, TransactionAccount>,
    system_program: Program<'info, System>,
}
/// Propose a transaction to be executed by a cryptid account
/// Note - at present, there is no constraint on who can propose a transaction.
pub fn propose_transaction<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, ProposeTransaction<'info>>,
    instructions: Vec<AbbreviatedInstructionData>,
) -> Result<()> {
    ctx.accounts.transaction_account.instructions = instructions;
    ctx.accounts.transaction_account.cryptid_account = *ctx.accounts.cryptid_account.key;
    ctx.accounts.transaction_account.approved_middleware = None;

    // Accounts stored into the transaction account are referenced by
    // the abbreviated instruction data by index
    // The same accounts must be passed, in the correct order, to the ExecuteTransaction instruction
    // Note - the order is retained between Propose and Execute, but some accounts are omitted during Propose
    //
    // Execute Transaction Accounts:
    // 0 - cryptid account
    // 1 - did*
    // 2 - did program*
    // 3 - signer*
    // ... remaining accounts
    //
    // * These accounts are omitted from the Propose Transaction Accounts
    // Account indexes must reflect this, so the first entry
    // in the remaining accounts is referred to in the abbreviated instruction data as index 4,
    // despite being index 0 in the remaining accounts.
    // TODO validate that the account indices are all valid, given the above i.e. that no index exceeds remaining_accounts.length + 4
    ctx.accounts.transaction_account.accounts = ctx.remaining_accounts.iter().map(|a| *a.key).collect();

    Ok(())
}
