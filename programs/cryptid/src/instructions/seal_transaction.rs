use crate::error::CryptidError;
use crate::instructions::util::*;
use crate::state::cryptid_account::CryptidAccount;
use crate::state::transaction_account::TransactionAccount;
use crate::state::transaction_state::TransactionState;
use crate::util::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(
/// A vector of controller DID authority keys. They are the authority keys associated with the controller remaining accounts.
controller_authority_keys: Vec<Pubkey>,
/// The bump seed for the Cryptid signer
cryptid_account_bump: u8,
/// Index of the cryptid account
cryptid_account_index: u32,
/// The bump seed for the Did Account
did_account_bump: u8,
)]
pub struct SealTransaction<'info> {
    /// The Cryptid instance to seal with
    /// CHECK: Cryptid Account can be generative and non-generative
    #[account(
        mut,
        // TODO: Verification done in instruction body. Move back with Anchor generator
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
    pub signer: Signer<'info>,
    /// The transaction to seal
    #[account(
        mut,
        has_one = cryptid_account @ CryptidError::WrongCryptidAccount,
        // only transactions in "not ready" state can be sealed
        constraint = transaction_account.state == TransactionState::NotReady @ CryptidError::InvalidTransactionState,
    )]
    pub transaction_account: Account<'info, TransactionAccount>,
}

/// Seals a transaction directly if all required keys sign
pub fn seal_transaction<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, SealTransaction<'info>>,
    controller_authority_keys: Vec<Pubkey>,
    cryptid_account_bump: u8,
    cryptid_account_index: u32,
    did_account_bump: u8,
) -> Result<()> {
    let controlling_did_accounts = ctx
        .remaining_accounts
        .iter()
        .zip(controller_authority_keys)
        .collect::<Vec<(&AccountInfo, Pubkey)>>();

    // Assume at this point that anchor has verified the cryptid account and did account (but not the controller chain)
    // We now need to verify that the signer (at the moment, only one is supported) is a valid signer for the cryptid account
    verify_keys(
        &ctx.accounts.did,
        Some(did_account_bump),
        ctx.accounts.signer.to_account_info().key,
        controlling_did_accounts,
    )?;

    // For seed verification
    CryptidAccount::try_from(
        &ctx.accounts.cryptid_account,
        &ctx.accounts.did_program.key(),
        &ctx.accounts.did.key(),
        cryptid_account_index,
        cryptid_account_bump,
    )?;

    // OK verification done, now we can seal the transaction
    ctx.accounts.transaction_account.state = TransactionState::Ready;

    Ok(())
}
