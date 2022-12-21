use crate::error::CryptidError;
use crate::instructions::util::{get_cryptid_account_checked, resolve_by_index, AllAccounts};
use crate::state::abbreviated_instruction_data::AbbreviatedInstructionData;
use crate::state::did_reference::DIDReference;
use crate::state::instruction_size::InstructionSize;
use crate::state::transaction_account::TransactionAccount;
use crate::state::transaction_state::TransactionState;
use crate::util::SolDID;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(
/// A vector of controller account indices and their associated DID authority keys (to allow for generative cases).
controller_chain: Vec<DIDReference>,
/// The bump seed for the Cryptid signer
cryptid_account_bump: u8,
/// Index of the cryptid account
cryptid_account_index: u32,
/// The bump seed for the Did Account
did_account_bump: u8,
/// The instructions to add to the transaction
instructions: Vec<AbbreviatedInstructionData>,
num_accounts: u8,
)]
pub struct ExtendTransaction<'info> {
    /// The Cryptid instance that can execute the transaction.
    /// CHECK: Cryptid Account can be generative and non-generative
    #[account(
        // TODO: Verification done in instruction body. Move back with Anchor generator
        // seeds = [CryptidAccount::SEED_PREFIX, did_program.key().as_ref(), did.key().as_ref(), cryptid_account_index.to_le_bytes().as_ref()],
        // bump = cryptid_account_bump
    )]
    pub cryptid_account: UncheckedAccount<'info>,
    /// The did account owner of the Cryptid instance
    /// CHECK: Unchecked to allow generative DID accounts.
    #[account()]
    pub did: UncheckedAccount<'info>,
    /// The program for the DID
    pub did_program: Program<'info, SolDID>,
    #[account(mut)]
    authority: Signer<'info>,
    #[account(
        mut,
        realloc = TryInto::<usize>::try_into(
            TransactionAccount::calculate_size(
                num_accounts.into(),
                InstructionSize::from_iter_to_iter(
                    instructions.iter()
                )
            )
        ).unwrap(),
        realloc::payer = authority,
        realloc::zero = false,
        has_one = cryptid_account @ CryptidError::WrongCryptidAccount,
        // only transactions in "not ready" state can be extended
        constraint = transaction_account.state == TransactionState::NotReady @ CryptidError::InvalidTransactionState,
    )]
    transaction_account: Account<'info, TransactionAccount>,
    system_program: Program<'info, System>,
}

/// Collect all accounts as a single vector so that they can be referenced by index by instructions
impl<'a, 'b, 'c, 'info> AllAccounts<'a, 'b, 'c, 'info>
    for Context<'a, 'b, 'c, 'info, ExtendTransaction<'info>>
{
    fn all_accounts(&self) -> Vec<&AccountInfo<'info>> {
        [
            self.accounts.cryptid_account.as_ref(),
            self.accounts.did.as_ref(),
            self.accounts.did_program.as_ref(),
            self.accounts.authority.as_ref(),
        ]
        .into_iter()
        .chain(self.remaining_accounts.iter())
        .collect()
    }

    fn get_accounts_by_indexes(&self, indexes: &[u8]) -> Result<Vec<&AccountInfo<'info>>> {
        let accounts = self.all_accounts();
        resolve_by_index(indexes, &accounts)
    }
}

/// Extend a transaction to be executed by a cryptid account
/// Note - at present, there is no constraint on who can extend a transaction.
pub fn extend_transaction<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, ExtendTransaction<'info>>,
    controller_chain: Vec<DIDReference>,
    cryptid_account_bump: u8,
    cryptid_account_index: u32,
    did_account_bump: u8,
    instructions: Vec<AbbreviatedInstructionData>,
) -> Result<()> {
    get_cryptid_account_checked(
        &ctx.all_accounts(),
        &controller_chain,
        &ctx.accounts.cryptid_account,
        &ctx.accounts.did,
        &ctx.accounts.did_program,
        &ctx.accounts.authority,
        did_account_bump,
        cryptid_account_index,
        cryptid_account_bump,
    )?;

    ctx.accounts
        .transaction_account
        .instructions
        .extend(instructions);

    // Accounts stored into the transaction account are referenced by
    // the abbreviated instruction data by index
    // The same accounts must be passed, in the correct order, to the ExecuteTransaction instruction
    // Note - the order is retained between Extend and Execute, but some accounts are omitted during Extend
    //
    // Execute Transaction Accounts:
    // 0 - cryptid account
    // 1 - did*
    // 2 - did program*
    // 3 - signer*
    // ... remaining accounts
    //
    // * These accounts are omitted from the Extend Transaction Accounts
    // Account indexes must reflect this, so the first entry
    // in the remaining accounts is referred to in the abbreviated instruction data as index 4,
    // despite being index 0 in the remaining accounts.
    // TODO validate that the account indices are all valid, given the above i.e. that no index exceeds remaining_accounts.length + 4
    ctx.accounts.transaction_account.accounts =
        ctx.remaining_accounts.iter().map(|a| *a.key).collect();

    Ok(())
}
