use std::mem::{size_of, swap};
use std::num::NonZeroU64;

use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

use solana_generator::*;

use crate::account::DOAAddress;
use crate::instruction::{verify_keys, SigningKey, SigningKeyBuild};
use crate::state::{DOAAccount, InstructionData, TransactionAccount};

/// Proposes a new transaction that can be approved and appended to
#[derive(Debug)]
pub struct ProposeTransaction;
impl Instruction for ProposeTransaction {
    type Data = ProposeTransactionData;
    type FromAccountsData = Vec<u8>;
    type Accounts = ProposeTransactionAccounts;
    type BuildArg = ProposeTransactionBuild;

    fn data_to_instruction_arg(data: &mut Self::Data) -> GeneratorResult<Self::FromAccountsData> {
        Ok(data.signers.iter().map(|(extras, _)| *extras).collect())
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
                )?;
                (
                    DOAAccount::GENERATIVE_DOA_KEY_THRESHOLD,
                    DOAAccount::GENERATIVE_DOA_SETTINGS_SEQUENCE,
                )
            }
        };

        accounts
            .transaction_account
            .set_funder(accounts.funder.clone());
        accounts.transaction_account.set_init_size(
            match NonZeroU64::new(
                (key_threshold as u64 - data.signers.len() as u64 + data.extra_keyspace as u64)
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

        verify_keys(
            &accounts.did_program,
            &accounts.did,
            accounts.signer_keys.iter(),
        )?;

        accounts.transaction_account.signers = accounts
            .signer_keys
            .iter()
            .zip(data.signers.iter().map(|(_, expiry_time)| *expiry_time))
            .map(|(signer, expiry_time)| (signer.signing_key.key, expiry_time))
            .collect();
        Ok(Some(accounts.system_program.clone()))
    }

    fn build_instruction(
        _program_id: Pubkey,
        arg: Self::BuildArg,
    ) -> GeneratorResult<(Vec<SolanaAccountMeta>, Self::Data)> {
        let data = ProposeTransactionData {
            signers: arg
                .signers
                .iter()
                .map(|(key, expiry)| (key.extra_count(), *expiry))
                .collect(),
            instructions: arg.instructions,
            extra_keyspace: arg.extra_keyspace,
        };

        let mut accounts = vec![
            SolanaAccountMeta::new(arg.funder, true),
            SolanaAccountMeta::new(arg.transaction_account, !arg.transaction_account_is_zeroed),
            SolanaAccountMeta::new_readonly(arg.doa, false),
            arg.did,
            SolanaAccountMeta::new_readonly(arg.did_program, false),
            SolanaAccountMeta::new_readonly(system_program_id(), false),
        ];
        accounts.extend(arg.signers.iter().map(|(key, _)| key.to_metas()).flatten());
        Ok((accounts, data))
    }
}

/// Accounts for [`ProposeTransaction`]
#[derive(Debug, AccountArgument)]
#[account_argument(instruction_data = signers: Vec<u8>)]
pub struct ProposeTransactionAccounts {
    /// The funder that will pay the rent
    #[account_argument(signer, writable, owner = system_program_id())]
    pub funder: AccountInfo,
    /// The account that will store the transaction information, can be init or zeroed
    pub transaction_account: InitOrZeroedAccount<TransactionAccount>,
    /// The DOA to execute for
    pub doa: DOAAddress,
    /// The DID for the DOA
    pub did: AccountInfo,
    /// The program for the DID
    pub did_program: AccountInfo,
    /// The system program
    pub system_program: SystemProgram,
    /// The signing keys, need at least one to propose irrespective of the key threshold
    #[account_argument(instruction_data = signers)]
    pub signer_keys: Vec<SigningKey>,
}

/// Instruction data for [`ProposeTransaction`]
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct ProposeTransactionData {
    /// The signers (extra account count, expire time)
    pub signers: Vec<(u8, UnixTimestamp)>,
    /// The instructions that will be executed
    pub instructions: Vec<InstructionData>,
    /// Number of extra signatures to allow, used for over-signing to account for expiry or key rotation
    pub extra_keyspace: u8, // TODO: Remove when flip flop or re-allocation added
}

/// Build argument for [`ProposeTransaction`]
#[derive(Debug)]
pub struct ProposeTransactionBuild {
    /// The funder that will pay the rent
    pub funder: Pubkey,
    /// The account that will store the transaction information, can be init or zeroed
    pub transaction_account: Pubkey,
    /// [`true`] if [`transaction_account`](ProposeTransactionBuild::transaction_account) is zeored, [`false`] if init
    pub transaction_account_is_zeroed: bool,
    /// The DOA to execute for
    pub doa: Pubkey,
    /// The DID for the DOA
    pub did: SolanaAccountMeta,
    /// The program for the DID
    pub did_program: Pubkey,
    /// The signing keys, need at least one to propose irrespective of the key threshold
    pub signers: Vec<(SigningKeyBuild, UnixTimestamp)>,
    /// The instructions that will be executed
    pub instructions: Vec<InstructionData>,
    /// Number of extra signatures to allow, used for over-signing to account for expiry or key rotation
    pub extra_keyspace: u8,
}
