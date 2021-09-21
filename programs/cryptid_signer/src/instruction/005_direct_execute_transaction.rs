use std::mem::swap;

use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

use solana_generator::*;

use crate::account::DOAAddress;
use crate::error::CryptIdSignerError;
use crate::state::{AccountMeta, InstructionData};
use solana_generator::solana_program::log::sol_log_compute_units;

#[derive(Debug, AccountArgument)]
#[account_argument(instruction_data = (signers: u8))]
pub struct DirectExecuteTransaction {
    pub doa: DOAAddress,
    pub did: AccountInfo,
    pub did_program: AccountInfo,
    // TODO: Same as propose transaction
    #[account_argument(instruction_data = (signers as usize, ()), signer)]
    pub signing_keys: Vec<AccountInfo>,
    /// Each account should only appear once
    pub instruction_accounts: Rest<AccountInfo>,
}
impl DirectExecuteTransaction {
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
pub struct DirectExecuteTransactionData {
    pub signers: u8,
    pub instructions: Vec<InstructionData>,
}

pub fn process_direct_execute_transaction(
    program_id: Pubkey,
    data: &mut DirectExecuteTransactionData,
    accounts: &mut DirectExecuteTransaction,
) -> GeneratorResult<()> {
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

    // TODO: Verify keys against did program

    let instruction_accounts_ref = accounts.instruction_accounts.0.iter().collect::<Vec<_>>();
    let signer_seeds = doa_signer_seeds!(accounts.doa.info().key, signer_nonce);

    let mut instructions = vec![];
    swap(&mut instructions, &mut data.instructions);
    for instruction in instructions {
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

    Ok(())
}
