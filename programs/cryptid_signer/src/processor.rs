use crate::error::CryptIdSignerError;
use crate::instruction::{
    CreateDOA, CreateDOAData, DirectExecuteTransaction, DirectExecuteTransactionData, Instruction,
    ProposeTransaction, ProposeTransactionData,
};
use crate::state::AccountMeta;
use crate::verify_doa_signer;
use solana_generator::solana_program::instruction::{
    AccountMeta as SolanaAccountMeta, Instruction as SolanaInstruction,
};
use solana_generator::{
    invoke_signed_variable_size, msg, AccountArgument, GeneratorResult, InitSize, Pubkey,
    UnixTimestamp,
};
use std::mem::{size_of, swap};
use std::num::NonZeroU64;

pub fn process_instruction(
    program_id: Pubkey,
    mut instruction: Instruction,
) -> GeneratorResult<()> {
    let system_program = match &mut instruction {
        Instruction::Test => {
            msg!("Test successful!");
            None
        }
        Instruction::CreateDOA(data, accounts) => {
            create_doa(program_id, data, accounts)?;
            Some(accounts.system_program.clone())
        }
        Instruction::ProposeTransaction(data, accounts) => {
            propose_transaction(program_id, data, accounts)?;
            Some(accounts.system_program.clone())
        }
        Instruction::DirectExecuteTransaction(data, accounts) => {
            direct_execute_transaction(program_id, data, accounts)?;
            None
        }
    };
    instruction.write_back(program_id, system_program.as_ref())
}

pub fn create_doa(
    program_id: Pubkey,
    data: &mut CreateDOAData,
    accounts: &mut CreateDOA,
) -> GeneratorResult<()> {
    verify_doa_signer(
        program_id,
        accounts.doa.info().key,
        accounts.doa_signer.key,
        data.signer_nonce,
    )?;

    accounts.doa.set_funder(accounts.funder.clone());
    accounts.doa.did = accounts.did.key;
    accounts.doa.did_program = accounts.did_program.key;
    accounts.doa.signer_nonce = data.signer_nonce;
    accounts.doa.key_threshold = data.key_threshold;
    accounts.doa.settings_sequence = 1;
    Ok(())
}

pub fn propose_transaction(
    _program_id: Pubkey,
    data: &mut ProposeTransactionData,
    accounts: &mut ProposeTransaction,
) -> GeneratorResult<()> {
    if data.expiry_times.len() != data.signers as usize {
        return Err(CryptIdSignerError::ExpiryTimesSizeMismatch {
            expiry_times_size: data.expiry_times.len(),
            signers_size: data.signers as usize,
        }
        .into());
    }

    accounts
        .transaction_account
        .set_funder(accounts.funder.clone());
    accounts.transaction_account.set_init_size(
        match NonZeroU64::new(
            (accounts.doa.key_threshold as u64 - data.signers as u64 + data.extra_keyspace as u64)
                * size_of::<(Pubkey, UnixTimestamp)>() as u64,
        ) {
            None => InitSize::DataSize,
            Some(non_zero) => InitSize::DataSizePlus(non_zero),
        },
    );

    accounts.transaction_account.doa = accounts.doa.info.key;
    accounts.transaction_account.transaction_instructions = vec![];
    swap(
        &mut accounts.transaction_account.transaction_instructions,
        &mut data.instructions,
    );
    accounts.transaction_account.has_executed = false;
    accounts.transaction_account.settings_sequence = accounts.doa.settings_sequence;

    // TODO: Verify keys against did program

    accounts.transaction_account.signers = accounts
        .signer_keys
        .iter()
        .zip(data.expiry_times.iter())
        .map(|(signer, expiry_time)| (signer.key, *expiry_time))
        .collect();
    Ok(())
}

pub fn direct_execute_transaction(
    _program_id: Pubkey,
    data: &mut DirectExecuteTransactionData,
    accounts: &mut DirectExecuteTransaction,
) -> GeneratorResult<()> {
    accounts
        .doa
        .verify_did_and_program(accounts.did.key, accounts.did_program.key)?;

    if data.signers < accounts.doa.key_threshold {
        return Err(CryptIdSignerError::NotEnoughSigners {
            expected: accounts.doa.key_threshold,
            received: data.signers,
        }
        .into());
    }

    // TODO: Verify keys against did program
    let instruction_accounts_ref = accounts.instruction_accounts.0.iter().collect::<Vec<_>>();
    let signer_seeds = doa_signer_seeds!(accounts.doa.info.key, accounts.doa.signer_nonce);

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

        invoke_signed_variable_size(
            &SolanaInstruction {
                program_id: instruction.program_id,
                accounts: metas,
                data: instruction.data,
            },
            &instruction_accounts_ref,
            &[signer_seeds],
        )?;
    }

    Ok(())
}
