use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

use solana_generator::*;

use crate::account::DOAAddress;
use crate::error::CryptIdSignerError;
use crate::generate_doa_signer;
use crate::instruction::verify_keys;
use crate::state::{AccountMeta, InstructionData};
use solana_generator::solana_program::log::sol_log_compute_units;
use std::collections::HashMap;

#[derive(Debug)]
pub struct DirectExecute;
impl Instruction for DirectExecute {
    type Data = DirectExecuteData;
    type Accounts = DirectExecuteAccounts;
    type BuildArg = DirectExecuteBuild;

    fn data_to_instruction_arg(
        data: &mut Self::Data,
    ) -> GeneratorResult<<Self::Accounts as AccountArgument>::InstructionArg> {
        Ok((data.signers,))
    }

    fn process(
        program_id: Pubkey,
        data: Self::Data,
        accounts: &mut Self::Accounts,
    ) -> GeneratorResult<Option<SystemProgram>> {
        accounts.print_keys();

        let (key_threshold, signer_key, signer_nonce) = match &accounts.doa {
            DOAAddress::OnChain(doa) => {
                doa.verify_did_and_program(accounts.did.key, accounts.did_program.key)?;
                let signer_seeds = doa_signer_seeds!(doa.info.key, doa.signer_nonce);
                let signer_key = Pubkey::create_program_address(signer_seeds, &program_id)?;
                (doa.key_threshold, signer_key, doa.signer_nonce)
            }
            DOAAddress::Generative(doa) => {
                DOAAddress::verify_seeds(
                    doa.key,
                    program_id,
                    accounts.did_program.key,
                    accounts.did.key,
                    None,
                )?;
                let signer_seeds = doa_signer_seeds!(doa.key);
                let (signer_key, signer_nonce) =
                    Pubkey::find_program_address(signer_seeds, &program_id);
                (1, signer_key, signer_nonce)
            }
        };

        if data.signers < key_threshold {
            return Err(CryptIdSignerError::NotEnoughSigners {
                expected: key_threshold,
                received: data.signers,
            }
            .into());
        }

        verify_keys(
            accounts.did_program.key,
            &accounts.did,
            accounts.signing_keys.iter(),
        )?;

        let instruction_accounts_ref = accounts.instruction_accounts.0.iter().collect::<Vec<_>>();
        let signer_seeds = doa_signer_seeds!(accounts.doa.info().key, signer_nonce);

        for instruction in data.instructions {
            let metas = instruction
                .accounts
                .iter()
                .map(|meta| SolanaAccountMeta {
                    pubkey: meta.key,
                    is_signer: meta.meta.contains(AccountMeta::IS_SIGNER),
                    is_writable: meta.meta.contains(AccountMeta::IS_WRITABLE),
                })
                .collect::<Vec<_>>();

            if metas.iter().any(|meta| meta.pubkey == signer_key) {
                msg!("invoking with signing");
                sol_log_compute_units();
                invoke_signed_variable_size(
                    &SolanaInstruction {
                        program_id: instruction.program_id,
                        accounts: metas,
                        data: instruction.data,
                    },
                    &instruction_accounts_ref,
                    &[signer_seeds],
                )?;
            } else {
                msg!("invoking without signing");
                sol_log_compute_units();
                invoke_variable_size(
                    &SolanaInstruction {
                        program_id: instruction.program_id,
                        accounts: metas,
                        data: instruction.data,
                    },
                    &instruction_accounts_ref,
                )?;
            }
        }

        Ok(None)
    }

    fn build_instruction(
        program_id: Pubkey,
        discriminant: &[u8],
        arg: Self::BuildArg,
    ) -> GeneratorResult<SolanaInstruction> {
        let signer_key = generate_doa_signer(program_id, arg.doa).0;
        let mut instruction_accounts = HashMap::new();

        // Go through all the instructions and collect all the accounts together
        for instruction in arg.instructions.iter() {
            instruction_accounts
                .entry(instruction.program_id)
                .or_insert_with(AccountMeta::empty); // No need to take the strongest as program has both false
            for account in instruction.accounts.iter() {
                let meta_value = if account.key == signer_key {
                    // If the account is the signer we don't want to sign it ourselves, the program will do that
                    account.meta & AccountMeta::IS_WRITABLE
                } else {
                    account.meta
                };

                *instruction_accounts
                    .entry(account.key)
                    .or_insert_with(AccountMeta::empty) |= meta_value; // Take the strongest value for each account
            }
        }
        // recombine `instruction_accounts` into a iterator of `SolanaAccountMeta`s
        let instruction_accounts =
            instruction_accounts
                .into_iter()
                .map(|(pubkey, value)| SolanaAccountMeta {
                    pubkey,
                    is_signer: value.contains(AccountMeta::IS_SIGNER),
                    is_writable: value.contains(AccountMeta::IS_WRITABLE),
                });

        let mut data = discriminant.to_vec();
        BorshSerialize::serialize(
            &DirectExecuteData {
                signers: arg.signing_keys.len() as u8,
                instructions: arg.instructions,
            },
            &mut data,
        )?;
        let mut accounts = vec![
            SolanaAccountMeta::new_readonly(arg.doa, false),
            arg.did,
            SolanaAccountMeta::new_readonly(arg.did_program, false),
        ];
        accounts.extend(
            arg.signing_keys
                .into_iter()
                .map(|key| SolanaAccountMeta::new_readonly(key, true)),
        );
        accounts.extend(instruction_accounts);
        Ok(SolanaInstruction {
            program_id,
            accounts,
            data,
        })
    }
}

#[derive(Debug, AccountArgument)]
#[account_argument(instruction_data = (signers: u8))]
pub struct DirectExecuteAccounts {
    pub doa: DOAAddress,
    pub did: AccountInfo,
    pub did_program: AccountInfo,
    // TODO: Same as propose transaction
    #[account_argument(instruction_data = (signers as usize, ()), signer)]
    pub signing_keys: Vec<AccountInfo>,
    /// Each account should only appear once
    pub instruction_accounts: Rest<AccountInfo>,
}
impl DirectExecuteAccounts {
    pub const DISCRIMINANT: u8 = 5;

    fn print_keys(&self) {
        msg!("doa: {}", self.doa.info().key);
        msg!("did: {}", self.did.key);
        msg!("did_program: {}", self.did_program.key);
        msg!(
            "signing_keys: {:?}",
            self.signing_keys
                .iter()
                .map(|account| account.key)
                .collect::<Vec<_>>()
        );
        msg!(
            "instruction_accounts: {:?}",
            self.instruction_accounts
                .0
                .iter()
                .map(|account| account.key)
                .collect::<Vec<_>>()
        );
    }
}
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct DirectExecuteData {
    pub signers: u8,
    pub instructions: Vec<InstructionData>,
}

#[derive(Debug)]
pub struct DirectExecuteBuild {
    pub doa: Pubkey,
    pub did: SolanaAccountMeta,
    pub did_program: Pubkey,
    pub signing_keys: Vec<Pubkey>,
    pub did_program_accounts: Vec<Pubkey>,
    pub instructions: Vec<InstructionData>,
}
