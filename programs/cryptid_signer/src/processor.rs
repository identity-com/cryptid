use crate::error::CryptIdSignerError;
use crate::instruction::{
    CreateDOA, CreateDOAData, Instruction, ProposeTransaction, ProposeTransactionData,
};
use crate::DOA_SIGNER_SEED;
use solana_generator::{
    msg, AccountArgument, GeneratorError, GeneratorResult, InitSize, Pubkey, UnixTimestamp,
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
    };
    instruction.write_back(program_id, system_program.as_ref())
}

pub fn create_doa(
    program_id: Pubkey,
    data: &mut CreateDOAData,
    accounts: &mut CreateDOA,
) -> GeneratorResult<()> {
    // TODO: Move this seeds check to `solana_generator`
    let seeds = &[
        DOA_SIGNER_SEED,
        &accounts.doa.info.key.to_bytes(),
        &[data.signer_nonce],
    ];
    if accounts.doa_signer.key != Pubkey::create_program_address(seeds, &program_id)? {
        return Err(GeneratorError::AccountNotFromSeeds {
            account: accounts.doa_signer.key,
            seeds: format!("{:?}", seeds),
            program_id,
        }
        .into());
    }

    accounts.doa.funder = Some(accounts.funder.clone());
    accounts.doa.did = accounts.did.key;
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

    accounts.transaction_account.funder = Some(accounts.funder.clone());
    accounts.transaction_account.init_size = match NonZeroU64::new(
        (accounts.doa.key_threshold as u64 - data.signers as u64 + data.extra_keyspace as u64)
            * size_of::<(Pubkey, UnixTimestamp)>() as u64,
    ) {
        None => InitSize::DataSize,
        Some(non_zero) => InitSize::DataSizePlus(non_zero),
    };

    accounts.transaction_account.doa = accounts.doa.info.key;
    accounts.transaction_account.transaction_instructions = vec![];
    swap(
        &mut accounts.transaction_account.transaction_instructions,
        &mut data.instructions,
    );
    accounts.transaction_account.has_executed = false;
    accounts.transaction_account.settings_sequence = accounts.doa.settings_sequence;

    todo!("Verify keys against did program");

    accounts.transaction_account.signers = accounts
        .signer_keys
        .iter()
        .zip(data.expiry_times.iter())
        .map(|(signer, expiry_time)| (signer.key, *expiry_time))
        .collect();
    Ok(())
}
