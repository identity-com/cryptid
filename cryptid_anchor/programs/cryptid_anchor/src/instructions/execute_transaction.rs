use crate::error::CryptidError;
use crate::instructions::util::*;
use crate::state::cryptid_account::CryptidAccount;
use crate::state::transaction_account::TransactionAccount;
use crate::state::transaction_state::TransactionState;
use crate::util::cpi::*;
use crate::util::*;
use anchor_lang::prelude::*;
use sol_did::state::DidAccount;

#[derive(Accounts)]
#[instruction(
/// A vector of the number of extras for each signer, signer count is the length
controller_chain: Vec<u8>,
/// The bump seed for the Cryptid signer
bump: u8,
/// Additional flags
flags: u8,
)]
pub struct ExecuteTransaction<'info> {
    /// The Cryptid instance to execute with
    /// CHECK: This assumes a purely generative case until we have use-cases that require a state.
    #[account(
        mut,
        seeds = [CryptidAccount::SEED_PREFIX, did_program.key().as_ref(), did.key().as_ref(), cryptid_account.index.to_le_bytes().as_ref()],
        bump
    )]
    pub cryptid_account: Account<'info, CryptidAccount>, // TODO use new macro that allows generative accounts
    /// The DID on the Cryptid instance
    pub did: Account<'info, DidAccount>,
    /// The program for the DID
    pub did_program: Program<'info, SolDID>,
    /// The signer of the transaction
    pub signer: Signer<'info>,
    /// CHECK: Rent destination account does not need to satisfy the any constraints.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
    /// The instruction to execute
    #[account(
        mut,
        close = destination,
        has_one = cryptid_account @ CryptidError::WrongCryptidAccount,
        // safeguard to prevent double-spends in the case where the account is not closed for some reason
        constraint = transaction_account.state != TransactionState::Executed @ CryptidError::InvalidTransactionState,
        // the transaction account must have been approved by the middleware on the cryptid account, if present
        constraint = transaction_account.approved_middleware == cryptid_account.middleware @ CryptidError::IncorrectMiddleware,
    )]
    pub transaction_account: Account<'info, TransactionAccount>,
}
/// Collect all accounts as a single vector so that they can be referenced by index by instructions
/// The order must be preserved between Propose and Execute
/// The did, did program, signer accounts are omitted from the Propose instruction
/// instruction_data_account is not considered here as it is a temporary "carrier" account that can not be referenced
/// as part of the instruction
impl<'a, 'b, 'c, 'info> AllAccounts<'a, 'b, 'c, 'info>
    for Context<'a, 'b, 'c, 'info, ExecuteTransaction<'info>>
{
    fn all_accounts(&self) -> Vec<&AccountInfo<'info>> {
        [
            self.accounts.cryptid_account.as_ref(),
            self.accounts.did.as_ref(),
            self.accounts.did_program.as_ref(),
            self.accounts.signer.as_ref(),
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

/// Executes a transaction directly if all required keys sign
pub fn execute_transaction<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, ExecuteTransaction<'info>>,
    controller_chain: Vec<u8>,
    bump: u8,
    flags: u8,
) -> Result<()> {
    let debug = ExecuteFlags::from_bits(flags)
        .unwrap()
        .contains(ExecuteFlags::DEBUG);
    if debug {
        ctx.accounts.print_keys();
    }

    ctx.accounts.transaction_account.state = TransactionState::Executed;

    // convert the controller chain (an array of account indices) into an array of accounts
    // note - cryptid does not need to check that the chain is valid, or even that they are DIDs
    // sol_did does that.
    let controlling_did_accounts = ctx.get_accounts_by_indexes(controller_chain.as_slice())?;

    // Assume at this point that anchor has verified the cryptid account and did account (but not the controller chain)
    // We now need to verify that the signer (at the moment, only one is supported) is a valid signer for the cryptid account
    verify_keys(
        &ctx.accounts.did,
        ctx.accounts.signer.to_account_info().key,
        controlling_did_accounts,
    )?;

    // At this point, we are safe that the signer is a valid owner of the cryptid account. We can execute the instructions
    CPI::execute_instructions(
        &ctx.accounts.transaction_account.instructions,
        &ctx.all_accounts(),
        &ctx.accounts.did_program.key(),
        &ctx.accounts.did.key(),
        &ctx.accounts.cryptid_account,
        &ctx.accounts.cryptid_account.to_account_info(),
        bump,
        debug,
    )?;

    Ok(())
}

impl ExecuteTransaction<'_> {
    /// Prints all the keys to the program log (compute budget intensive)
    pub fn print_keys(&self) {
        msg!(
            "cryptid_account: {}",
            self.cryptid_account.to_account_info().key
        );
        msg!("did: {}", self.did.to_account_info().key);
        msg!("did_program: {}", self.did_program.to_account_info().key);
        msg!("signer: {}", self.signer.to_account_info().key);
    }
}
