use crate::error::CryptidError;
use crate::instructions::util::*;
use crate::state::did_reference::DIDReference;
use crate::state::transaction_account::TransactionAccount;
use crate::state::transaction_state::TransactionState;
use crate::util::*;
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
)]
pub struct CloseTransaction<'info> {
    /// The Cryptid instance to execute with
    /// CHECK: Cryptid Account can be generative and non-generative
    #[account(
    mut,
    // TODO(ticket): Verification done in instruction body. Move back with Anchor generator
    // seeds = [CryptidAccount::SEED_PREFIX, did_program.key().as_ref(), did.key().as_ref(), cryptid_account_index.to_le_bytes().as_ref()],
    // bump = cryptid_account_bump
    )]
    pub cryptid_account: UncheckedAccount<'info>,
    /// The DID on the Cryptid instance
    /// CHECK: DID Account can be generative or not
    pub did: UncheckedAccount<'info>,
    /// The program for the DID
    pub did_program: Program<'info, SolDID>,
    /// The signer of the transaction
    pub authority: Signer<'info>,
    /// CHECK: Rent destination account does not need to satisfy the any constraints.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
    /// The instruction to execute
    #[account(
    mut,
    close = destination,
    has_one = cryptid_account @ CryptidError::WrongCryptidAccount,
    // This Instruction only allows to recover transactions that were not executed.
    constraint = transaction_account.state != TransactionState::Executed @ CryptidError::InvalidTransactionState,
    // if the transaction was created
    constraint = transaction_account.unauthorized_signer.unwrap_or_else(|| authority.key()) == authority.key() @ CryptidError::KeyMustBeSigner,
    )]
    pub transaction_account: Account<'info, TransactionAccount>,
}

/// Collect all accounts as a single vector so that they can be referenced by index by instructions
/// The order must be preserved between Propose and Execute
/// The did, did program, signer accounts are omitted from the Propose instruction
/// instruction_data_account is not considered here as it is a temporary "carrier" account that can not be referenced
/// as part of the instruction
impl<'a, 'b, 'c, 'info> AllAccounts<'a, 'b, 'c, 'info>
    for Context<'a, 'b, 'c, 'info, CloseTransaction<'info>>
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

/// Close an existing transaction account
pub fn close_transaction<'info>(
    ctx: Context<'_, '_, '_, 'info, CloseTransaction<'info>>,
    controller_chain: Vec<DIDReference>,
    cryptid_account_bump: u8,
    cryptid_account_index: u32,
    did_account_bump: u8,
) -> Result<()> {
    // if there is an unauthorized signer, it must be the one executing the transaction
    // in this case, a superuser middleware must have authorized the transaction
    if let Some(unauthorized_signer) = ctx.accounts.transaction_account.unauthorized_signer {
        require_keys_eq!(
            ctx.accounts.authority.key(),
            unauthorized_signer,
            CryptidError::KeyMustBeSigner
        );
    }

    let all_accounts = ctx.all_accounts();

    // At this point, the transaction account signer has been checked to be the same as the authority
    // and the tx has been approved by the middleware
    // so we can assume that the transaction can be closed by the unauthorized signer, if there is one.
    let allow_unauthorized_signer = ctx
        .accounts
        .transaction_account
        .unauthorized_signer
        .is_some();

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
        allow_unauthorized_signer,
    )?;

    Ok(())
}
