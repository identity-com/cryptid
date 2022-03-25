use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

use crate::account::{CryptidAccountAddress, CryptidAddressValidate};
use crate::error::CryptidSignerError;
use crate::instruction::{verify_keys, SigningKey};
use crate::state::InstructionData;
use bitflags::bitflags;
use cruiser::account_argument::AccountArgument;
use cruiser::account_types::rest::Rest;
use cruiser::instruction::{Instruction, InstructionProcessor};
use cruiser::solana_program::log::sol_log_compute_units;
use cruiser::{invoke_variable_size, msg, AccountInfo, CruiserResult, Pubkey, SolanaInstruction};

/// Executes a transaction directly if all required keys sign
#[derive(Debug)]
pub struct DirectExecute;
impl Instruction for DirectExecute {
    type Data = DirectExecuteData;
    type Accounts = DirectExecuteAccounts;
}
impl InstructionProcessor<DirectExecute> for DirectExecute {
    type FromAccountsData = Vec<u8>;
    type ValidateData = Option<u8>;
    type InstructionData = DirectExecuteInstructionData;

    fn data_to_instruction_arg(
        data: <Self as Instruction>::Data,
    ) -> CruiserResult<(
        Self::FromAccountsData,
        Self::ValidateData,
        Self::InstructionData,
    )> {
        Ok((
            data.signers_extras,
            data.account_nonce,
            DirectExecuteInstructionData {
                instructions: data.instructions,
                flags: data.flags,
                signer_nonce: data.signer_nonce,
            },
        ))
    }

    fn process(
        program_id: &'static Pubkey,
        data: Self::InstructionData,
        accounts: &mut <Self as Instruction>::Accounts,
    ) -> CruiserResult<()> {
        let debug = data.flags.contains(DirectExecuteFlags::DEBUG);
        if debug {
            accounts.print_keys();
        }

        // Error if there aren't enough signers
        if accounts.signing_keys.len() < accounts.cryptid_account.key_threshold() as usize {
            return Err(CryptidSignerError::NotEnoughSigners {
                expected: accounts.cryptid_account.key_threshold(),
                received: accounts.signing_keys.len() as u8,
            }
            .into());
        }

        msg!("Verifying keys");
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

        let (signer_seeds, signer_key) = accounts
            .cryptid_account
            .signer_seed_set(program_id, data.signer_nonce);
        let signer_key = match signer_key {
            None => signer_seeds.create_address(program_id)?,
            Some(key) => key,
        };

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
                signer_seeds.invoke_signed_variable_size(
                    &SolanaInstruction {
                        program_id: *instruction_account_keys[instruction.program_id as usize],
                        accounts: metas,
                        data: instruction.data,
                    },
                    &instruction_accounts_ref,
                )
            } else {
                msg!("Invoking without signature");
                invoke_variable_size(
                    &SolanaInstruction {
                        program_id: *instruction_account_keys[instruction.program_id as usize],
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

        Ok(())
    }
}
/// The accounts for [`DirectExecute`]
#[derive(Debug, AccountArgument)]
#[from(data = (signers_extras: Vec<u8>))]
#[validate(data = (account_nonce: Option<u8>))]
pub struct DirectExecuteAccounts {
    /// The DOA to execute with
    #[validate(data = CryptidAddressValidate{
        did: self.did.key,
        did_program: self.did_program.key,
        account_nonce,
    })]
    pub cryptid_account: CryptidAccountAddress,
    /// The DID on the DOA
    pub did: AccountInfo,
    /// The program for the DID
    pub did_program: AccountInfo,
    /// The set of keys that sign for this transaction
    #[from(data = signers_extras)]
    pub signing_keys: Vec<SigningKey>,
    /// Accounts for the instructions, each should only appear once
    pub instruction_accounts: Rest<AccountInfo>,
}
impl DirectExecuteAccounts {
    /// Prints all the keys to the program log (compute budget intensive)
    pub fn print_keys(&self) {
        msg!("cryptid_account: {}", self.cryptid_account.info().key);
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
    /// The nonce for the account if generative
    pub account_nonce: Option<u8>,
    /// The nonce for the signer if generative
    pub signer_nonce: Option<u8>,
}
#[derive(Debug)]
/// Instruction data for [`DirectExecute`]
pub struct DirectExecuteInstructionData {
    instructions: Vec<InstructionData>,
    flags: DirectExecuteFlags,
    signer_nonce: Option<u8>,
}

bitflags! {
    /// Extra flags passed to DirectExecute
    #[derive(BorshSerialize, BorshDeserialize, BorshSchema)]
    pub struct DirectExecuteFlags: u8{
        /// Print debug logs, uses a large portion of the compute budget
        const DEBUG = 1 << 0;
    }
}
