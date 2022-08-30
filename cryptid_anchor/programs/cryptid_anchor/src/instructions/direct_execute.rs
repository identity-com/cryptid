use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::log::sol_log_compute_units;
use anchor_lang::solana_program::program::invoke_signed;
use bitflags::bitflags;
use crate::state::cryptid_account::CryptidAccount;
use crate::state::instruction_data::InstructionData;
use crate::util::*;
use crate::instructions::util::*;
use sol_did::state::DidAccount;
use crate::error::CryptidError;
use crate::util::seeder::*;


#[derive(Accounts)]
#[instruction(
/// A vector of the number of extras for each signer, signer count is the length
signers_extras: Vec<u8>,
/// The instructions to execute
instructions: Vec<InstructionData>,
/// Additional flags
flags: DirectExecuteFlags,
)]
pub struct DirectExecute<'info> {
    /// The Cryptid instance to execute with
    pub cryptid_account: Account<'info, CryptidAccount>,
    /// The DID on the Cryptid instance
    pub did: Account<'info, DidAccount>,
    /// The program for the DID
    pub did_program: Program<'info, SolDID>,
    /// The signer of the transaction
    pub signer: Signer<'info>,
}
/// Collect all accounts as a single vector so that they can be referenced by index by instructions
// TODO: Note - I initially wanted to use some crate to iterate over a struct's fields, so I could define
// this for all Contexts automatically, but failed. We could either leave it like this or try again.
// Once decided, remove this comment.
// Note also - the lifetime parameters here are all the same because the accounts in the Context all use the same lifetime
// I don't think it needs to be this way, but I don't think it matters,
// since all accounts will have the same lifetime in effect (i.e. the lifetime of the tx)
impl<'a, 'b, 'c, 'info> AllAccounts<'a, 'b, 'c, 'info> for Context<'a, 'b, 'c, 'info, DirectExecute<'info>> {
    fn all_accounts(&self) -> Vec<&AccountInfo<'info>> {
        [
            self.accounts.cryptid_account.as_ref(),
            self.accounts.did.as_ref(),
            self.accounts.did_program.as_ref(),
            self.accounts.signer.as_ref()
        ].into_iter()
            .chain(self.remaining_accounts.iter()).collect()
    }

    fn get_accounts_by_indexes(&self, indexes: &[u8]) -> Result<Vec<&AccountInfo<'info>>> {
        let accounts = self.all_accounts();
        let mut resolved_accounts = Vec::new();
        for i in indexes {
            let i = *i as usize;
            if i >= accounts.len() {
                msg!("Account index {} out of bounds", i);
                return err!(CryptidError::IndexOutOfRange);
            }
            resolved_accounts.push(accounts[i]);
        }
        Ok(resolved_accounts)
    }
}

/// Executes a transaction directly if all required keys sign
pub fn direct_execute<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, DirectExecute<'info>>,
    controller_chain: Vec<u8>,
    instructions: Vec<InstructionData>,
    flags: DirectExecuteFlags,
) -> Result<()> {
    let debug = flags.contains(DirectExecuteFlags::DEBUG);
    if debug {
        ctx.accounts.print_keys();
    }

    let seeder: Box<dyn PDASeeder> = match ctx.accounts.cryptid_account.is_generative() {
        true => {
            msg!("Cryptid is generative");
            Box::new(GenerativeCryptidSeeder {
                did_program: *ctx.accounts.did_program.key,
                did: ctx.accounts.did.key(),
            })
        },
        false => {
            msg!("Cryptid is not generative");
            Box::new(CryptidSignerSeeder {
                cryptid_account: ctx.accounts.cryptid_account.key(),
            })
        }
    };

    // convert the controller chain (an array of account indices) into an array of accounts
    // note - cryptid does not need to check that the chain is valid, or even that they are DIDs
    // sol_did does that
    let controlling_did_accounts = ctx.get_accounts_by_indexes(controller_chain.as_slice())?;
    verify_keys(
        &ctx.accounts.did,
        &ctx.accounts.signer,
        controlling_did_accounts,
    )?;

    // Assume at this point that anchor has verified the cryptid account and did account (but not the controller chain)
    // We now need to verify that the signer (at the moment, only one is supported) is a valid signer for the cryptid account
    let all_accounts_ref_vec = ctx.all_accounts();
    let all_keys_vec = all_accounts_ref_vec.iter().map(|a| a.key.clone()).collect::<Vec<_>>();

    // At this point, we are safe that the signer is a valid owner of the cryptid account. We can execute the instruction
    // TODO - if we want direct-execute to support multisig, we need to support more signers here
    // If we dont need direct-execute to support multisig, then we still need to verify that the cryptid account
    // does not have a key threshold > 1, and if so, reject the tx (because direct-execute would only have one key)
    // For now, we just go ahead and execute the instruction, ignoring key_threshold

    // generate the instructions to execute
    let solana_instructions = instructions
        .into_iter()
        .map(
            |instruction| {
                instruction.into_instruction(&all_keys_vec[..])
            })
        .collect::<Vec<_>>();

    // Execute instructions
    for (index, instruction_data) in instructions.into_iter().enumerate() {
        let solana_instruction = instruction_data.into_instruction(&all_keys_vec[..]);
        let account_indexes = instruction_data.accounts.iter().map(|a| a.key).collect::<Vec<_>>();
        let account_infos = ctx
            .get_accounts_by_indexes(account_indexes.as_slice())?
            .into_iter()
            .cloned()
            .collect::<Vec<_>>();

        let seeds = seeder.seeds();

        msg!("Remaining compute units for sub-instruction `{}`", index);
        sol_log_compute_units();

        // Check if the metas contain a the signer and run relevant invoke
        let is_signed_by_cryptid = solana_instruction.accounts.iter().any(|meta| meta.pubkey.eq(ctx.accounts.signer.key));
        let sub_instruction_result = if is_signed_by_cryptid {
            msg!("Invoking signed");
            invoke_signed(
                &solana_instruction,
                account_infos.as_slice(),
                &[&[seeds.as_slice()]],
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

    // // Retrieve needed data from cryptid account
    // let (key_threshold, signer_key, signer_seed_set) = match &ctx.accounts.cryptid_account {
    //     CryptidAccountAddress::OnChain(cryptid) => {
    //         cryptid.verify_did_and_program(accounts.did.key, accounts.did_program.key)?;
    //         let seeder = CryptidSignerSeeder {
    //             cryptid_account: cryptid.info.key,
    //         };
    //         let signer_key = seeder.create_address(program_id, cryptid.signer_nonce)?;
    //         (
    //             cryptid.key_threshold,
    //             signer_key,
    //             PDASeedSet::new(seeder, cryptid.signer_nonce),
    //         )
    //     }
    //     CryptidAccountAddress::Generative(cryptid) => {
    //         CryptidAccountAddress::verify_seeds(
    //             cryptid.key,
    //             program_id,
    //             accounts.did_program.key,
    //             accounts.did.key,
    //         )?;
    //         let seeder = CryptidSignerSeeder {
    //             cryptid_account: cryptid.key,
    //         };
    //         let (signer_key, signer_nonce) = seeder.find_address(program_id);
    //         (
    //             CryptidAccount::GENERATIVE_CRYPTID_KEY_THRESHOLD,
    //             signer_key,
    //             PDASeedSet::new(seeder, signer_nonce),
    //         )
    //     }
    // };
    //
    // // Error if there aren't enough signers
    // require_gte!(data.signers_extras.len(), key_threshold as usize, CryptidError::NotEnoughSigners);
    //
    // msg!("Verifying keys");
    // // Verify the keys sent, this only checks that one is valid for now but will use the threshold eventually
    // verify_keys(
    //     &ctx.accounts.did_program,
    //     &ctx.accounts.did,
    //     accounts.signing_keys.iter(),
    // )?;
    //
    // let instruction_accounts_ref = accounts.instruction_accounts.iter().collect::<Vec<_>>();
    // let instruction_account_keys = accounts
    //     .instruction_accounts
    //     .iter()
    //     .map(|account| account.key)
    //     .collect::<Vec<_>>();
    //
    // msg!("Executing instructions");
    // // Execute instructions
    // for (index, instruction) in data.instructions.into_iter().enumerate() {
    //     // Convert the metas
    //     let metas = instruction
    //         .accounts
    //         .iter()
    //         .cloned()
    //         .map(|meta| meta.into_solana_account_meta(&instruction_account_keys))
    //         .collect::<Vec<_>>();
    //
    //     msg!("Remaining compute units for sub-instruction `{}`", index);
    //     sol_log_compute_units();
    //
    //     // Check if the metas contain a the signer and run relevant invoke
    //     let sub_instruction_result = if metas.iter().any(|meta| meta.pubkey == signer_key) {
    //         msg!("Invoking signed");
    //         signer_seed_set.invoke_signed_variable_size(
    //             &SolanaInstruction {
    //                 program_id: instruction_account_keys[instruction.program_id as usize],
    //                 accounts: metas,
    //                 data: instruction.data,
    //             },
    //             &instruction_accounts_ref,
    //         )
    //     } else {
    //         msg!("Invoking without signature");
    //         invoke_variable_size(
    //             &SolanaInstruction {
    //                 program_id: instruction_account_keys[instruction.program_id as usize],
    //                 accounts: metas,
    //                 data: instruction.data,
    //             },
    //             &instruction_accounts_ref,
    //         )
    //     };
    //
    //     // If sub-instruction errored log the index and error
    //     if let Err(error) = sub_instruction_result {
    //         return err!(CryptidError::SubInstructionError);
    //     }
    // }

    Ok(())
}

// fn build_instruction(
//     program_id: Pubkey,
//     arg: Self::BuildArg,
// ) -> Result<(Vec<SolanaAccountMeta>, Self::Data)> {
//     let signer_key = CryptidSignerSeeder {
//         cryptid_account: arg.cryptid_account,
//     }
//         .find_address(program_id)
//         .0;
//     let mut instruction_accounts = HashMap::new();
//
//     // Go through all the instructions and collect all the accounts together
//     for instruction in arg.instructions.iter() {
//         instruction_accounts
//             .entry(instruction.program_id)
//             .or_insert_with(AccountMeta::empty); // No need to take the strongest as program has both false
//         for account in instruction.accounts.iter() {
//             let meta_value = if arg.instruction_accounts[account.key as usize] == signer_key {
//                 // If the account is the signer we don't want to sign it ourselves, the program will do that
//                 account.meta & AccountMeta::IS_WRITABLE
//             } else {
//                 account.meta
//             };
//
//             *instruction_accounts
//                 .entry(account.key)
//                 .or_insert_with(AccountMeta::empty) |= meta_value; // Take the strongest value for each account
//         }
//     }
//     // recombine `instruction_accounts` into a iterator of `SolanaAccountMeta`s
//     let instruction_accounts =
//         arg.instruction_accounts
//             .into_iter()
//             .enumerate()
//             .map(|(index, value)| {
//                 let meta = instruction_accounts
//                     .get(&(index as u8))
//                     .expect("Could not get meta");
//                 SolanaAccountMeta {
//                     pubkey: value,
//                     is_signer: meta.contains(AccountMeta::IS_SIGNER),
//                     is_writable: meta.contains(AccountMeta::IS_WRITABLE),
//                 }
//             });
//
//     let data = DirectExecuteData {
//         signers_extras: arg
//             .signing_keys
//             .iter()
//             .map(SigningKeyBuild::extra_count)
//             .collect(),
//         instructions: arg.instructions,
//         flags: arg.flags,
//     };
//     let mut accounts = vec![
//         SolanaAccountMeta::new_readonly(arg.cryptid_account, false),
//         arg.did,
//         SolanaAccountMeta::new_readonly(arg.did_program, false),
//     ];
//     accounts.extend(arg.signing_keys.iter().flat_map(SigningKeyBuild::to_metas));
//     accounts.extend(instruction_accounts);
//     Ok((accounts, data))
// }

impl DirectExecute<'_> {
    /// Prints all the keys to the program log (compute budget intensive)
    pub fn print_keys(&self) {
        msg!("cryptid_account: {}", self.cryptid_account.to_account_info().key);
        msg!("did: {}", self.did.to_account_info().key);
        msg!("did_program: {}", self.did_program.to_account_info().key);
        msg!("signer: {}", self.signer.to_account_info().key);
    }
}

bitflags! {
    /// Extra flags passed to DirectExecute
    #[derive(AnchorDeserialize, AnchorSerialize)]
    pub struct DirectExecuteFlags: u8{
        /// Print debug logs, uses a large portion of the compute budget
        const DEBUG = 1 << 0;
    }
}
