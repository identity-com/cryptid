use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

use solana_generator::*;

use crate::account::DOAAddress;
use crate::error::CryptidSignerError;
use crate::instruction::{verify_keys, SigningKey, SigningKeyBuild};
use crate::state::{AccountMeta, InstructionData};
use crate::DOASignerSeeder;
use bitflags::bitflags;
use solana_generator::solana_program::log::sol_log_compute_units;
use std::collections::HashMap;

/// Executes a transaction directly if all required keys sign
#[derive(Debug)]
pub struct DirectExecute;
impl Instruction for DirectExecute {
    type Data = DirectExecuteData;
    type FromAccountsData = Vec<u8>;
    type Accounts = DirectExecuteAccounts;
    type BuildArg = DirectExecuteBuild;

    fn data_to_instruction_arg(data: &mut Self::Data) -> GeneratorResult<Self::FromAccountsData> {
        Ok(data.signers_extras.clone())
    }

    fn process(
        program_id: Pubkey,
        data: Self::Data,
        accounts: &mut Self::Accounts,
    ) -> GeneratorResult<Option<SystemProgram>> {
        msg!("Got here 1");
        let debug = data.flags.contains(DirectExecuteFlags::DEBUG);
        if debug {
            accounts.print_keys();
        }

        // Retrieve needed data from doa
        let (key_threshold, signer_generator, signer_key, signer_nonce) = match &accounts.doa {
            DOAAddress::OnChain(doa) => {
                doa.verify_did_and_program(accounts.did.key, accounts.did_program.key)?;
                let generator =
                    PDAGenerator::new(program_id, DOASignerSeeder { doa: doa.info.key });
                let signer_key = generator.create_address(doa.signer_nonce)?;
                (doa.key_threshold, generator, signer_key, [doa.signer_nonce])
            }
            DOAAddress::Generative(doa) => {
                DOAAddress::verify_seeds(
                    doa.key,
                    program_id,
                    accounts.did_program.key,
                    accounts.did.key,
                )?;
                let generator = PDAGenerator::new(program_id, DOASignerSeeder { doa: doa.key });
                let (signer_key, signer_nonce) = generator.find_address();
                (1, generator, signer_key, [signer_nonce])
            }
        };

        // Error if there aren't enough signers
        if data.signers_extras.len() < key_threshold as usize {
            return Err(CryptidSignerError::NotEnoughSigners {
                expected: key_threshold,
                received: data.signers_extras.len() as u8,
            }
            .into());
        }

        msg!("Verifying keys");
        // Verify the keys sent, this only checks that one is valid for now but will use the threshold eventually
        verify_keys(
            &accounts.did_program,
            &accounts.did,
            accounts.signing_keys.iter(),
        )?;

        let instruction_accounts_ref = accounts.instruction_accounts.iter().collect::<Vec<_>>();
        let instruction_account_keys = accounts
            .instruction_accounts
            .iter()
            .map(|account| account.key)
            .collect::<Vec<_>>();
        let signer_seeds = signer_generator.seeds_to_bytes(Some(&signer_nonce));

        msg!("Executing instructions");
        // Execute instructions
        for (index, instruction) in data.instructions.into_iter().enumerate() {
            // Convert the metas
            let metas = instruction
                .accounts
                .iter()
                .cloned()
                .map(|meta| meta.into_solana_account_meta(&instruction_account_keys))
                .collect::<Vec<_>>();

            msg!("Remaining compute units for sub-instruction `{}`", index);
            sol_log_compute_units();

            // Check if the metas contain a the signer and run relevant invoke
            let sub_instruction_result = if metas.iter().any(|meta| meta.pubkey == signer_key) {
                msg!("Invoking signed");
                invoke_signed_variable_size(
                    &SolanaInstruction {
                        program_id: instruction_account_keys[instruction.program_id as usize],
                        accounts: metas,
                        data: instruction.data,
                    },
                    &instruction_accounts_ref,
                    &[&signer_seeds],
                )
            } else {
                msg!("Invoking without signature");
                invoke_variable_size(
                    &SolanaInstruction {
                        program_id: instruction_account_keys[instruction.program_id as usize],
                        accounts: metas,
                        data: instruction.data,
                    },
                    &instruction_accounts_ref,
                )
            };

            // If sub-instruction errored log the index and error
            if let Err(error) = sub_instruction_result {
                return Err(CryptidSignerError::SubInstructionError { index, error }.into());
            }
        }

        Ok(None)
    }

    fn build_instruction(
        program_id: Pubkey,
        arg: Self::BuildArg,
    ) -> GeneratorResult<(Vec<SolanaAccountMeta>, Self::Data)> {
        let signer_key = PDAGenerator::new(program_id, DOASignerSeeder { doa: arg.doa })
            .find_address()
            .0;
        let mut instruction_accounts = HashMap::new();

        // Go through all the instructions and collect all the accounts together
        for instruction in arg.instructions.iter() {
            instruction_accounts
                .entry(instruction.program_id)
                .or_insert_with(AccountMeta::empty); // No need to take the strongest as program has both false
            for account in instruction.accounts.iter() {
                let meta_value = if arg.instruction_accounts[account.key as usize] == signer_key {
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
        let instruction_accounts = arg
            .instruction_accounts
            .into_iter()
            .enumerate()
            .map(|(index, value)| {
                let meta = instruction_accounts
                    .get(&(index as u8))
                    .expect("Could not get meta");
                SolanaAccountMeta {
                    pubkey: value,
                    is_signer: meta.contains(AccountMeta::IS_SIGNER),
                    is_writable: meta.contains(AccountMeta::IS_WRITABLE),
                }
            })
            .collect::<Vec<_>>();

        let data = DirectExecuteData {
            signers_extras: arg
                .signing_keys
                .iter()
                .map(SigningKeyBuild::extra_count)
                .collect(),
            instructions: arg.instructions,
            flags: arg.flags,
        };
        let mut accounts = vec![
            SolanaAccountMeta::new_readonly(arg.doa, false),
            arg.did,
            SolanaAccountMeta::new_readonly(arg.did_program, false),
        ];
        accounts.extend(
            arg.signing_keys
                .iter()
                .map(SigningKeyBuild::to_metas)
                .flatten(),
        );
        accounts.extend(instruction_accounts.into_iter());
        Ok((accounts, data))
    }
}

/// The accounts for [`DirectExecute`]
#[derive(Debug, AccountArgument)]
#[account_argument(instruction_data = signers_extras: Vec<u8>)]
pub struct DirectExecuteAccounts {
    /// The DOA to execute with
    pub doa: DOAAddress,
    /// The DID on the DOA
    pub did: AccountInfo,
    /// The program for the DID
    pub did_program: AccountInfo,
    /// The set of keys that sign for this transaction
    #[account_argument(instruction_data = signers_extras)]
    pub signing_keys: Vec<SigningKey>,
    /// Accounts for the instructions, each should only appear once
    pub instruction_accounts: Rest<AccountInfo>,
}
impl DirectExecuteAccounts {
    /// Prints all the keys to the program log (compute budget intensive)
    pub fn print_keys(&self) {
        msg!("doa: {}", self.doa.info().key);
        msg!("did: {}", self.did.key);
        msg!("did_program: {}", self.did_program.key);
        msg!(
            "signing_keys: {:?}",
            self.signing_keys
                .iter()
                .map(|signing_keys| signing_keys.to_key_string())
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

/// The instruction data for [`DirectExecute`]
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct DirectExecuteData {
    /// A vector of the number of extras for each signer, signer count is the length
    pub signers_extras: Vec<u8>,
    /// The instructions to execute
    pub instructions: Vec<InstructionData>,
    /// Additional flags
    pub flags: DirectExecuteFlags,
}

#[test]
fn data_test() {
    let mut data: &[u8] = &[
        5, 1, 0, 0, 0, 0, 5, 0, 0, 0, 0, 2, 0, 0, 0, 1, 3, 2, 3, 52, 0, 0, 0, 0, 0, 0, 0, 96, 77,
        22, 0, 0, 0, 0, 0, 82, 0, 0, 0, 0, 0, 0, 0, 6, 221, 246, 225, 215, 101, 161, 147, 217, 203,
        225, 70, 206, 235, 121, 172, 28, 180, 133, 237, 95, 91, 55, 145, 58, 140, 245, 133, 126,
        255, 0, 169, 3, 2, 0, 0, 0, 2, 2, 4, 0, 67, 0, 0, 0, 0, 2, 7, 188, 61, 250, 72, 117, 227,
        181, 19, 167, 130, 251, 228, 61, 183, 5, 1, 213, 195, 50, 223, 59, 145, 106, 53, 62, 173,
        205, 176, 149, 114, 121, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 1, 3, 5, 3, 52, 0, 0, 0, 0, 0, 0, 0, 240,
        29, 31, 0, 0, 0, 0, 0, 165, 0, 0, 0, 0, 0, 0, 0, 6, 221, 246, 225, 215, 101, 161, 147, 217,
        203, 225, 70, 206, 235, 121, 172, 28, 180, 133, 237, 95, 91, 55, 145, 58, 140, 245, 133,
        126, 255, 0, 169, 3, 4, 0, 0, 0, 5, 2, 2, 0, 1, 0, 4, 0, 1, 0, 0, 0, 1, 3, 3, 0, 0, 0, 2,
        2, 5, 2, 1, 1, 9, 0, 0, 0, 7, 232, 3, 0, 0, 0, 0, 0, 0, 1,
    ];
    let data = &mut data;
    let discriminant = solana_generator::Take::take_single(data);
    println!("discriminant: {:?}", discriminant);
    let data: DirectExecuteData = BorshDeserialize::try_from_slice(data).unwrap();
    println!("data: {:#?}", data);
}

/// The build argument for [`DirectExecute`]
#[derive(Debug)]
pub struct DirectExecuteBuild {
    /// The DOA to execute with
    pub doa: Pubkey,
    /// The DID for the DOA
    pub did: SolanaAccountMeta,
    /// The program for the DID
    pub did_program: Pubkey,
    /// The signing keys for this transaction
    pub signing_keys: Vec<SigningKeyBuild>,
    /// The list of instruction accounts
    pub instruction_accounts: Vec<Pubkey>,
    /// The instructions to execute
    pub instructions: Vec<InstructionData>,
    /// Additional flags
    pub flags: DirectExecuteFlags,
}

bitflags! {
    /// Extra flags passed to DirectExecute
    #[derive(BorshSerialize, BorshDeserialize, BorshSchema)]
    pub struct DirectExecuteFlags: u8{
        /// Print debug logs, uses a large portion of the compute budget
        const DEBUG = 1 << 0;
    }
}
