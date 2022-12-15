use crate::error::CryptidError;
use crate::instructions::util::*;
use crate::state::cryptid_account::CryptidAccount;
use crate::util::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(
/// Optional middleware to be associated with the cryptid account
middleware: Option<Pubkey>,
/// The controller chain between the authority and the did
controller_chain: Vec<Pubkey>,
/// The index of this cryptid account - allows multiple cryptid accounts per DID
index: u32,
/// The bump seed for the Did Account
did_account_bump: u8,
)]
pub struct Create<'info> {
    #[account(
    init,
    payer = authority,
    space = 8 + CryptidAccount::MAX_SIZE,
    seeds = [CryptidAccount::SEED_PREFIX, did_program.key().as_ref(), did.key().as_ref(), index.to_le_bytes().as_ref()],
    bump,
    )]
    pub cryptid_account: Account<'info, CryptidAccount>,
    /// The program for the DID
    pub did_program: Program<'info, SolDID>,
    /// The DID on the Cryptid instance
    /// CHECK: DID Account can be generative or not
    pub did: UncheckedAccount<'info>,
    /// The signer of the transaction. Must be a DID authority.
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn create(
    ctx: Context<Create>,
    middleware: Option<Pubkey>,
    controller_chain: Vec<Pubkey>,
    index: u32,
    did_account_bump: u8,
) -> Result<()> {
    require_gt!(index, 0, CryptidError::CreatingWithZeroIndex);
    ctx.accounts.cryptid_account.middleware = middleware;
    ctx.accounts.cryptid_account.index = index;

    // convert the controller chain (an array of account indices) into an array of accounts
    // note - cryptid does not need to check that the chain is valid, or even that they are DIDs
    // sol_did does that
    let controlling_did_accounts = ctx
        .remaining_accounts
        .iter()
        .zip(controller_chain.iter())
        .map(|(account, pubkey)| (account, *pubkey))
        .collect::<Vec<(&AccountInfo, Pubkey)>>();

    // At this point, anchor has verified the cryptid account and did account (but not the controller chain)
    // We now need to verify that the signer (at the moment, only one is supported) is a valid signer for the cryptid account
    verify_keys(
        &ctx.accounts.did,
        Some(did_account_bump),
        ctx.accounts.authority.to_account_info().key,
        controlling_did_accounts,
    )?;

    Ok(())
}
