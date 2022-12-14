use crate::instructions::util::*;
use crate::state::abbreviated_instruction_data::AbbreviatedInstructionData;
use crate::state::cryptid_account::CryptidAccount;
use crate::state::did_reference::DIDReference;
use crate::util::cpi::CPI;
use crate::util::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(
/// A vector of controller account indices and their associated DID authority keys (to allow for generative cases).
controller_chain: Vec<DIDReference>,
/// The instructions to execute
instructions: Vec<AbbreviatedInstructionData>,
/// The bump seed for the Cryptid signer
cryptid_account_bump: u8,
/// Index of the cryptid account
cryptid_account_index: u32,
/// The bump seed for the Did Account
did_account_bump: u8,
/// Additional flags
flags: u8,
)]
pub struct DirectExecute<'info> {
    /// The Cryptid instance to execute with
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
}
/// Collect all accounts as a single vector so that they can be referenced by index by instructions
impl<'a, 'b, 'c, 'info> AllAccounts<'a, 'b, 'c, 'info>
    for Context<'a, 'b, 'c, 'info, DirectExecute<'info>>
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
pub fn direct_execute<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, DirectExecute<'info>>,
    controller_chain: Vec<DIDReference>,
    instructions: Vec<AbbreviatedInstructionData>,
    cryptid_account_bump: u8,
    cryptid_account_index: u32,
    did_account_bump: u8,
    flags: u8,
) -> Result<()> {
    let debug = ExecuteFlags::from_bits(flags)
        .unwrap()
        .contains(ExecuteFlags::DEBUG);
    if debug {
        ctx.accounts.print_keys();
    }

    // convert the controller chain (an array of account indices) into an array of accounts
    // note - cryptid does not need to check that the chain is valid, or even that they are DIDs
    // sol_did does that
    let all_accounts = ctx.all_accounts();
    let controlling_did_accounts = controller_chain
        .iter()
        .map(|controller_reference| {
            (
                all_accounts[controller_reference.account_index as usize],
                controller_reference.authority_key,
            )
        })
        .collect::<Vec<(&AccountInfo, Pubkey)>>();

    msg!("Controlling did accounts: {:?}", controlling_did_accounts);

    // Assume at this point that anchor has verified the cryptid account and did account (but not the controller chain)
    // We now need to verify that the signer (at the moment, only one is supported) is a valid signer for the cryptid account
    verify_keys(
        &ctx.accounts.did,
        Some(did_account_bump),
        ctx.accounts.signer.to_account_info().key,
        controlling_did_accounts,
    )?;

    let cryptid_account = CryptidAccount::try_from(
        &ctx.accounts.cryptid_account,
        &ctx.accounts.did_program.key(),
        &ctx.accounts.did.key(),
        cryptid_account_index,
        cryptid_account_bump,
    )?;

    // At this point, we are safe that the signer is a valid owner of the cryptid account. We can execute the instructions
    CPI::execute_instructions(
        &instructions,
        &ctx.all_accounts(),
        &ctx.accounts.did_program.key(),
        &ctx.accounts.did.key(),
        &cryptid_account,
        &ctx.accounts.cryptid_account.to_account_info(),
        cryptid_account_bump,
        debug,
    )?;

    Ok(())
}

impl DirectExecute<'_> {
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
