use crate::error::CryptidError;
use crate::id;
use crate::instructions::util::resolve_by_index;
use crate::state::cryptid_account::CryptidAccount;
use crate::util::seeder::*;
use crate::AbbreviatedInstructionData;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::log::sol_log_compute_units;
use anchor_lang::solana_program::program::{invoke, invoke_signed};
use anchor_lang::solana_program::program_utils::limited_deserialize;
use anchor_lang::solana_program::system_instruction::SystemInstruction;

/// The first byte of a transfer instruction is the instruction type
/// as defined by the system program
/// https://docs.rs/solana-sdk/1.4.9/solana_sdk/system_instruction/enum.SystemInstruction.html
pub const TRANSFER_INSTRUCTION_INDEX: u8 = 2;

pub fn is_transfer(solana_instruction: &Instruction) -> bool {
    solana_instruction.program_id == System::id()
        && solana_instruction.data[0] == TRANSFER_INSTRUCTION_INDEX
}

pub struct CPI {}
impl CPI {
    #[allow(clippy::too_many_arguments)]
    pub fn execute_instructions(
        instructions: &Vec<AbbreviatedInstructionData>,
        accounts: &Vec<&AccountInfo>,
        did_program: &Pubkey,
        did: &Pubkey,
        // TODO(ticket): Simplify if generative Accounts are supported
        // We pass these two parameters separately, because we don't know if the cryptid account is
        // generative or not. Therefore we cannot pass Account<CryptidAccount>
        // potentially, once the new macro is available, replace this with an account object
        // like Account<CryptidAccount>, allowing us to call
        // cryptid_account.index and cryptid_account.key() on the same object
        // this would save us an extra parameter here.
        cryptid_account: &CryptidAccount,
        cryptid_account_info: &AccountInfo,
        bump: u8,
        debug: bool,
    ) -> Result<()> {
        let all_keys_vec = accounts.iter().map(|a| *a.key).collect::<Vec<_>>();

        let seeder = Box::new(CryptidSeeder {
            did_program: *did_program,
            did: *did,
            index: cryptid_account.index,
            bump,
        });

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

                msg!(
                    "Remaining compute units for sub-instruction `{}` of {}",
                    index,
                    instructions.len()
                );
                sol_log_compute_units();
            }

            let solana_instruction = instruction_data.clone().into_instruction(&all_keys_vec[..]);
            let account_indexes = instruction_data
                .accounts
                .iter()
                .map(|a| a.key)
                .collect::<Vec<_>>();
            let account_infos = resolve_by_index(account_indexes.as_slice(), accounts)?
                .into_iter()
                .cloned()
                .collect::<Vec<_>>();

            let sub_instruction_result =
                if Self::is_native_transfer_needed(cryptid_account_info, &solana_instruction) {
                    // short-circuit for transfer instructions (see comment on execute_transfer)
                    Self::execute_safe_transfer(
                        cryptid_account_info,
                        instruction_data,
                        &solana_instruction,
                        &account_infos,
                    )
                } else {
                    let seeds = seeder.seeds();

                    // Check if the instruction needs cryptid to sign it, if so, invoke it with cryptid account PDA seeds, otherwise, just invoke it
                    let is_signed_by_cryptid = solana_instruction
                        .accounts
                        .iter()
                        .any(|meta| meta.pubkey.eq(cryptid_account_info.key) && meta.is_signer);
                    if is_signed_by_cryptid {
                        if debug {
                            msg!("Invoking signed with seeds: {:?}", seeds);
                        }

                        // Turn Vec<Vec<u8>> into &[&[u8]]
                        // TODO: do it better (presumably by changing the type of `seeds`)
                        let seeds_slices_vec: Vec<&[u8]> = seeds.iter().map(|x| &x[..]).collect();

                        invoke_signed(
                            &solana_instruction,
                            account_infos.as_slice(),
                            &[&seeds_slices_vec[..]],
                        )
                        .map_err(|_| error!(CryptidError::SubInstructionError))
                    } else {
                        msg!("Invoking without signature -  not yet supported");
                        // TODO: IDCOM-2103: Add tests
                        invoke(&solana_instruction, account_infos.as_slice())
                            .map_err(|_| error!(CryptidError::SubInstructionError))
                    }
                };

            // If sub-instruction errored log the index and error
            if let Err(ref error) = sub_instruction_result {
                msg!("Error in sub-instruction `{}`: {:?}", index, error);
                return sub_instruction_result;
            }
        }
        Ok(())
    }

    fn is_native_transfer_needed(
        cryptid_account_info: &AccountInfo,
        instruction: &Instruction,
    ) -> bool {
        is_transfer(instruction) && cryptid_account_info.owner == &id()
    }

    /// SOL Transfer instructions cannot be executed as CPIs from PDAs with data.
    /// Due to the following constraint:
    /// https://github.com/solana-labs/solana/commit/7e94cc2cc3ef6161de0e89af1c4127bb455b4de2#diff-3f8645400d0e866a22f752c366c32d95e1fab1320db79bbda3c699da1b4e39afR80
    /// ` 'Transfer: `from` must not carry data',`
    /// See also: https://www.reddit.com/r/solanadev/comments/rnodg2/sol_escrow_pda_with_anchor/
    /// so if this is a non-generative cryptid account, we need to do it manually.
    fn execute_safe_transfer(
        cryptid_account_info: &AccountInfo,
        instruction_data: &AbbreviatedInstructionData,
        solana_instruction: &Instruction,
        account_infos: &[AccountInfo],
    ) -> Result<()> {
        // The sender must be the cryptid account.
        require_keys_eq!(
            account_infos[0].key(),
            cryptid_account_info.key(),
            CryptidError::AccountMismatch
        );
        // The cryptid account must be marked as a signer (even though it is a PDA)
        require!(
            solana_instruction.accounts[0].is_signer,
            CryptidError::KeyMustBeSigner
        );
        // the second account is the recipient
        let recipient = account_infos
            .get(1)
            .ok_or(CryptidError::SubInstructionError)?;

        Self::execute_transfer_unchecked(instruction_data, cryptid_account_info, recipient)
    }

    fn execute_transfer_unchecked(
        instruction: &AbbreviatedInstructionData,
        cryptid_account: &AccountInfo,
        recipient: &AccountInfo,
    ) -> Result<()> {
        let deserialized_instruction =
            limited_deserialize(&instruction.data, instruction.data.len() as u64)
                .map_err(|_| CryptidError::SubInstructionError)?;
        match deserialized_instruction {
            SystemInstruction::Transfer { lamports } => {
                // Safe, as long as overflow-checks = true is set in cargo.toml
                let mut account_lamports = cryptid_account.try_borrow_mut_lamports()?;
                **account_lamports -= lamports;

                let mut recipient_lamports = recipient.try_borrow_mut_lamports()?;
                **recipient_lamports += lamports;
            }
            _ => return Err(CryptidError::SubInstructionError.into()),
        }

        Ok(())
    }
}
