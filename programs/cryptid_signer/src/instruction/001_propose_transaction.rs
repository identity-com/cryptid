use std::mem::{size_of, swap};
use std::num::NonZeroU64;

use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

use solana_generator::*;

use crate::error::CryptIdSignerError;
use crate::state::{DOAAccount, InstructionData, TransactionAccount};

#[derive(Debug, AccountArgument)]
#[account_argument(instruction_data = (signers: u8))]
pub struct ProposeTransaction {
    #[account_argument(signer, writable, owner = system_program_id())]
    pub funder: AccountInfo,
    pub transaction_account: InitOrZeroedAccount<TransactionAccount>,
    pub doa: ProgramAccount<DOAAccount>,
    pub did: AccountInfo,
    pub did_program: AccountInfo,
    pub system_program: SystemProgram,
    // TODO: Clean up `instruction_data` to `singers as usize`, maybe a `size` argument?
    #[account_argument(instruction_data = (signers as usize, ()), signer)]
    pub signer_keys: Vec<AccountInfo>,
    pub extra_accounts: Rest<AccountInfo>,
}
impl ProposeTransaction {
    pub const DISCRIMINANT: u8 = 1;
}
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct ProposeTransactionData {
    pub signers: u8,
    pub instructions: Vec<InstructionData>,
    pub expiry_times: Vec<UnixTimestamp>,
    pub extra_keyspace: u8, // TODO: Remove when flip flop or re-allocation added
}

pub fn process_propose_transaction(
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
