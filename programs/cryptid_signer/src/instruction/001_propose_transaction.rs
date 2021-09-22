use std::mem::{size_of, swap};
use std::num::NonZeroU64;

use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

use solana_generator::*;

use crate::account::DOAAddress;
use crate::error::CryptIdSignerError;
use crate::state::{DOAAccount, InstructionData, TransactionAccount};

#[derive(Debug)]
pub struct ProposeTransaction;
impl Instruction for ProposeTransaction {
    type Data = ProposeTransactionData;
    type Accounts = ProposeTransactionAccounts;
    type BuildArg = ProposeTransactionBuild;

    fn data_to_instruction_arg(
        data: &mut Self::Data,
    ) -> GeneratorResult<<Self::Accounts as AccountArgument>::InstructionArg> {
        Ok((data.signers,))
    }

    fn process(
        program_id: Pubkey,
        mut data: Self::Data,
        accounts: &mut Self::Accounts,
    ) -> GeneratorResult<Option<SystemProgram>> {
        let (key_threshold, settings_sequence) = match &accounts.doa {
            DOAAddress::OnChain(account) => (account.key_threshold, account.settings_sequence),
            DOAAddress::Generative(account) => {
                DOAAddress::verify_seeds(
                    account.key,
                    program_id,
                    accounts.did_program.key,
                    accounts.did.key,
                    None,
                )?;
                (
                    DOAAccount::GENERATIVE_DOA_KEY_THRESHOLD,
                    DOAAccount::GENERATIVE_DOA_SETTINGS_SEQUENCE,
                )
            }
        };
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
                (key_threshold as u64 - data.signers as u64 + data.extra_keyspace as u64)
                    * size_of::<(Pubkey, UnixTimestamp)>() as u64,
            ) {
                None => InitSize::DataSize,
                Some(non_zero) => InitSize::DataSizePlus(non_zero),
            },
        );

        accounts.transaction_account.doa = accounts.doa.info().key;
        accounts.transaction_account.transaction_instructions = vec![];
        swap(
            &mut accounts.transaction_account.transaction_instructions,
            &mut data.instructions,
        );
        accounts.transaction_account.has_executed = false;
        accounts.transaction_account.settings_sequence = settings_sequence;

        // TODO: Verify keys against did program

        accounts.transaction_account.signers = accounts
            .signer_keys
            .iter()
            .zip(data.expiry_times.iter())
            .map(|(signer, expiry_time)| (signer.key, *expiry_time))
            .collect();
        Ok(Some(accounts.system_program.clone()))
    }

    fn build_instruction(
        program_id: Pubkey,
        discriminant: &[u8],
        arg: Self::BuildArg,
    ) -> GeneratorResult<SolanaInstruction> {
        let mut data = discriminant.to_vec();
        BorshSerialize::serialize(
            &ProposeTransactionData {
                signers: arg.signers.len() as u8,
                instructions: arg.instructions,
                expiry_times: arg
                    .signers
                    .iter()
                    .map(|(_, expiry_time)| *expiry_time)
                    .collect(),
                extra_keyspace: arg.extra_keyspace,
            },
            &mut data,
        )?;
        let mut accounts = vec![
            SolanaAccountMeta::new(arg.funder, true),
            SolanaAccountMeta::new(arg.transaction_account, !arg.transaction_account_is_zeroed),
            SolanaAccountMeta::new_readonly(arg.doa, false),
            arg.did,
            SolanaAccountMeta::new_readonly(arg.did_program, false),
            SolanaAccountMeta::new_readonly(system_program_id(), false),
        ];
        accounts.extend(
            arg.signers
                .into_iter()
                .map(|(key, _)| SolanaAccountMeta::new_readonly(key, true)),
        );
        accounts.extend(arg.extra_accounts);
        Ok(SolanaInstruction {
            program_id,
            accounts,
            data,
        })
    }
}

#[derive(Debug, AccountArgument)]
#[account_argument(instruction_data = (signers: u8))]
pub struct ProposeTransactionAccounts {
    #[account_argument(signer, writable, owner = system_program_id())]
    pub funder: AccountInfo,
    pub transaction_account: InitOrZeroedAccount<TransactionAccount>,
    pub doa: DOAAddress,
    pub did: AccountInfo,
    pub did_program: AccountInfo,
    pub system_program: SystemProgram,
    // TODO: Clean up `instruction_data` to `singers as usize`, maybe a `size` argument?
    #[account_argument(instruction_data = (signers as usize, ()), signer)]
    pub signer_keys: Vec<AccountInfo>,
    pub extra_accounts: Rest<AccountInfo>,
}
impl ProposeTransactionAccounts {
    pub const DISCRIMINANT: u8 = 1;
}
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct ProposeTransactionData {
    pub signers: u8,
    pub instructions: Vec<InstructionData>,
    pub expiry_times: Vec<UnixTimestamp>,
    pub extra_keyspace: u8, // TODO: Remove when flip flop or re-allocation added
}

#[derive(Debug)]
pub struct ProposeTransactionBuild {
    pub funder: Pubkey,
    pub transaction_account: Pubkey,
    pub transaction_account_is_zeroed: bool,
    pub doa: Pubkey,
    pub did: SolanaAccountMeta,
    pub did_program: Pubkey,
    pub signers: Vec<(Pubkey, UnixTimestamp)>,
    pub extra_accounts: Vec<SolanaAccountMeta>,
    pub instructions: Vec<InstructionData>,
    pub extra_keyspace: u8,
}
