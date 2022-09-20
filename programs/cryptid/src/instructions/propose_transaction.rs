use crate::state::abbreviated_instruction_data::AbbreviatedInstructionData;
use crate::state::instruction_size::InstructionSize;
use crate::state::transaction_account::TransactionAccount;
use crate::state::transaction_state::TransactionState;
use anchor_lang::prelude::*;

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
    pub cryptid_account: UncheckedAccount<'info>, // TODO allow generative/non-generative
    /// The owner of the Cryptid instance, typically a DID account
    /// CHECK: Unchecked to allow generative DID accounts.
    #[account()]
    pub owner: UncheckedAccount<'info>, // TODO allow generative/non-generative
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
        ))
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
    ctx.accounts.transaction_account.owner = *ctx.accounts.owner.key;
    ctx.accounts.transaction_account.instructions = instructions;
    ctx.accounts.transaction_account.cryptid_account = *ctx.accounts.cryptid_account.key;
    ctx.accounts.transaction_account.approved_middleware = None;
    // Extending transactions is not yet supported, so transactions are initialised in Ready state
    ctx.accounts.transaction_account.state = TransactionState::Ready;

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
    ctx.accounts.transaction_account.accounts =
        ctx.remaining_accounts.iter().map(|a| *a.key).collect();

    Ok(())
}
