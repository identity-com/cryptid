use crate::error::CryptidError;
use crate::instructions::util::*;
use crate::state::transaction_account::TransactionAccount;
use crate::util::seeder::*;
use crate::util::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::log::sol_log_compute_units;
use anchor_lang::solana_program::program::invoke_signed;
use sol_did::state::DidAccount;

#[derive(Accounts)]
pub struct ExecuteTransaction<'info> {
    /// The Cryptid instance to execute with
    /// CHECK: This assumes a purely generative case until we have use-cases that require a state.
    #[account(mut)]
    pub cryptid_account: UncheckedAccount<'info>,
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
        has_one = cryptid_account,
        // TODO Middleware readiness
        // constraint = transaction_account.approved_middleware == *cryptid_account.middleware,
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
        resolve_by_index(indexes, accounts)
    }
}

/// Executes a transaction directly if all required keys sign
pub fn execute_transaction<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, ExecuteTransaction<'info>>,
    controller_chain: Vec<u8>,
    middleware_account: Option<Pubkey>,
    cryptid_account_bump: u8,
    flags: u8,
) -> Result<()> {
    let debug = ExecuteFlags::from_bits(flags)
        .unwrap()
        .contains(ExecuteFlags::DEBUG);
    if debug {
        ctx.accounts.print_keys();
    }

    let instructions = &ctx.accounts.transaction_account.instructions;

    // passing middleware here ensures that the middleware account passed in the instruction parameters
    // is the same as the one that was used to generate the cryptid account, while allowing the account
    // to remain stateless
    // TODO do we care about stateless cryptid (i.e. generative) in this case? Is it simpler just to
    // create a cryptid account and add the middleware account to it as a property?
    let seeder = Box::new(GenerativeCryptidSeeder {
        did_program: *ctx.accounts.did_program.key,
        did: ctx.accounts.did.key(),
        additional_seeds: middleware_account
            .map_or(vec![], |middleware| vec![middleware.to_bytes().to_vec()]),
        bump: cryptid_account_bump,
    });

    // convert the controller chain (an array of account indices) into an array of accounts
    // note - cryptid does not need to check that the chain is valid, or even that they are DIDs
    // sol_did does that
    let controlling_did_accounts = ctx.get_accounts_by_indexes(controller_chain.as_slice())?;
    verify_keys(
        &ctx.accounts.did,
        ctx.accounts.signer.to_account_info().key,
        controlling_did_accounts,
    )?;

    // verify that the transaction has been passed by the middleware
    verify_middleware(&ctx.accounts.transaction_account, &middleware_account)?;

    // Assume at this point that anchor has verified the cryptid account and did account (but not the controller chain)
    // We now need to verify that the signer (at the moment, only one is supported) is a valid signer for the cryptid account
    let all_accounts_ref_vec = ctx.all_accounts();
    let all_keys_vec = all_accounts_ref_vec
        .iter()
        .map(|a| *a.key)
        .collect::<Vec<_>>();

    // At this point, we are safe that the signer is a valid owner of the cryptid account. We can execute the instruction
    // TODO - if we want direct-execute to support multisig, we need to support more signers here
    // If we dont need direct-execute to support multisig, then we still need to verify that the cryptid account
    // does not have a key threshold > 1, and if so, reject the tx (because direct-execute would only have one key)
    // For now, we just go ahead and execute the instruction, ignoring key_threshold

    // Generate and Execute instructions
    for (index, instruction_data) in instructions.iter().enumerate() {
        if debug {
            msg!(
                "Executing instruction {} program {} accounts {:?}",
                index,
                instruction_data.program_id,
                instruction_data
                    .accounts
                    .iter()
                    .map(|a| a.key)
                    .collect::<Vec<_>>()
            );
        }
        let solana_instruction = instruction_data.clone().into_instruction(&all_keys_vec[..]);
        let account_indexes = instruction_data
            .accounts
            .iter()
            .map(|a| a.key)
            .collect::<Vec<_>>();
        let account_infos = ctx
            .get_accounts_by_indexes(account_indexes.as_slice())?
            .into_iter()
            .cloned()
            .collect::<Vec<_>>();

        let seeds = seeder.seeds();

        msg!(
            "Remaining compute units for sub-instruction `{}` of {}",
            index,
            instructions.len()
        );
        sol_log_compute_units();

        // Check if the instruction needs cryptid to sign it, if so, invoke it with cryptid account PDA seeds, otherwise, just invoke it
        let is_signed_by_cryptid = solana_instruction
            .accounts
            .iter()
            .any(|meta| meta.pubkey.eq(ctx.accounts.cryptid_account.key));
        let sub_instruction_result = if is_signed_by_cryptid {
            if debug {
                msg!("Invoking signed with seeds: {:?}", seeds);
            }

            // Ohhh kay - time to try to turn Vec<Vec<u8>> into &[&[u8]]
            // TODO: do it better (presumably by changing the type of `seeds`)
            let seeds_slices_vec: Vec<&[u8]> = seeds.iter().map(|x| &x[..]).collect();

            invoke_signed(
                &solana_instruction,
                account_infos.as_slice(),
                &[&seeds_slices_vec[..]],
            )
            .map_err(|_| error!(CryptidError::SubInstructionError))
        } else {
            msg!("Invoking without signature");
            Ok(())
            // TODO
            // invoke_variable_size(instruction);
        };

        // If sub-instruction errored log the index and error
        if let Err(ref error) = sub_instruction_result {
            msg!("Error in sub-instruction `{}`: {:?}", index, error);
            return sub_instruction_result;
        }
    }

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
