use crate::error::CryptidError;
use crate::instructions::util::{get_cryptid_account_checked, resolve_by_index, AllAccounts};
use crate::state::abbreviated_account_meta::AbbreviatedAccountMeta;
use crate::state::abbreviated_instruction_data::AbbreviatedInstructionData;
use crate::state::did_reference::DIDReference;
use crate::state::instruction_size::InstructionSize;
use crate::state::transaction_account::TransactionAccount;
use crate::state::transaction_state::TransactionState;
use crate::util::SolDID;
use anchor_lang::prelude::*;
use itertools::Itertools;

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
    /// The state to set the transaction to
    state: TransactionState,
    /// The instructions to add to the transaction
    instructions: Vec<AbbreviatedInstructionData>,
    /// The number of new accounts referred to in the instructions
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
    pub authority: Signer<'info>,
    #[account(
        mut,
        has_one = cryptid_account @ CryptidError::WrongCryptidAccount,
        // only transactions in "not ready" state can be extended
        constraint = transaction_account.state == TransactionState::NotReady @ CryptidError::InvalidTransactionState,
        // resize the transaction account to fit the new instructions
        realloc = TransactionAccount::calculate_size(
                transaction_account.accounts.len() + num_accounts as usize,
                InstructionSize::from_iter_to_iter(
                    instructions.iter().chain(transaction_account.instructions.iter())
                )
            ),
        realloc::payer = authority,
        realloc::zero = false,
    )]
    pub transaction_account: Account<'info, TransactionAccount>,
    pub system_program: Program<'info, System>,
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

impl ExtendTransaction<'_> {
    fn update_instructions(
        transaction_account: &Account<TransactionAccount>,
        new_instructions: &mut [&mut AbbreviatedInstructionData],
        new_instruction_accounts: &[&AccountInfo],
    ) -> Vec<Pubkey> {
        let mut new_accounts_to_push = vec![];

        // for each instruction, look at its accounts
        // if the account is in transaction_account.accounts, update its index in the instruction
        // if the account is not in transaction_account.accounts, add it to the transaction_accounts and update the index in the instruction
        new_instructions.iter_mut().for_each(
            |new_instruction: &mut &mut AbbreviatedInstructionData| {
                new_instruction.accounts.iter_mut().for_each(
                    |mut new_instruction_account_meta: &mut AbbreviatedAccountMeta| {
                        let account =
                            new_instruction_accounts[new_instruction_account_meta.key as usize];
                        if let Some((index, _key)) = transaction_account
                            .accounts
                            .iter()
                            .find_position(|existing_account| *existing_account == account.key)
                        {
                            // The account from the new instruction is already in the transaction account
                            // with index `index`
                            new_instruction_account_meta.key = index as u8;
                        } else {
                            // The account from the new instruction is a new account
                            // add it to the array of accounts, and set the index to the last index
                            new_instruction_account_meta.key =
                                transaction_account.accounts.len() as u8;
                            new_accounts_to_push.push(*account.key);
                        }
                    },
                );
            },
        );

        new_accounts_to_push
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
    state: TransactionState,
    mut instructions: Vec<AbbreviatedInstructionData>,
) -> Result<()> {
    let all_accounts = ctx.all_accounts();

    get_cryptid_account_checked(
        &all_accounts,
        &controller_chain,
        &ctx.accounts.cryptid_account,
        &ctx.accounts.did,
        &ctx.accounts.did_program,
        &ctx.accounts.authority,
        did_account_bump,
        cryptid_account_index,
        cryptid_account_bump,
    )?;

    let mut mutable_references: Vec<&mut AbbreviatedInstructionData> =
        instructions.iter_mut().collect();

    let new_accounts_to_push = ExtendTransaction::update_instructions(
        &ctx.accounts.transaction_account,
        &mut mutable_references,
        &all_accounts,
    );

    // we have updated all the instruction indices. Add them to the transaction account
    ctx.accounts
        .transaction_account
        .accounts
        .extend(new_accounts_to_push);
    ctx.accounts
        .transaction_account
        .instructions
        .extend(instructions);

    // Update the state of the transaction account (setting it to Ready as needed)
    require_neq!(
        state,
        TransactionState::Executed,
        CryptidError::InvalidTransactionState
    );
    ctx.accounts.transaction_account.state = state;

    Ok(())
}
