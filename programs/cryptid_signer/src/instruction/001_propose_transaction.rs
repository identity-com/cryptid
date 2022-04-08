use std::ops::DerefMut;

use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

use solana_generator::*;

use crate::account::CryptidAccountAddress;
use crate::instruction::{verify_keys, SigningKey, SigningKeyBuild};
use crate::state::{CryptidAccount, InstructionData, TransactionAccount, TransactionState};
use crate::{CryptidSignerSeeder, TransactionSeeder};

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
        data: Self::Data,
        accounts: &mut Self::Accounts,
    ) -> GeneratorResult<Option<SystemProgram>> {
        // Verify keys are valid for the did
        verify_keys(
            &accounts.did_program,
            &accounts.did,
            accounts.signer_keys.iter(),
        )?;

        let transaction_seeder = TransactionSeeder {
            cryptid_account: accounts.cryptid_account.info().key,
            seed: data.account_seed,
        };
        // Verify transaction account is from given seed
        let transaction_nonce = transaction_seeder
            .verify_address_find_nonce(program_id, accounts.transaction_account.info.key)?;

        // Verify the incoming values are the same as the cryptid account
        accounts.cryptid_account.verify_cryptid_account(
            &program_id,
            &accounts.did_program.key,
            &accounts.did.key,
        )?;

        // Extract relevant values from cryptid account
        let (settings_sequence, signer_key, signer_seed_set) = match &accounts.cryptid_account {
            CryptidAccountAddress::OnChain(account) => {
                let seeder = CryptidSignerSeeder {
                    cryptid_account: account.info.key,
                };
                let signer = seeder.create_address(program_id, account.signer_nonce)?;
                (
                    account.settings_sequence,
                    signer,
                    PDASeedSet::new(seeder, account.signer_nonce),
                )
            }
            CryptidAccountAddress::Generative(account) => {
                let seeder = CryptidSignerSeeder {
                    cryptid_account: account.key,
                };
                let (signer, nonce) = seeder.find_address(program_id);
                (
                    CryptidAccount::GENERATIVE_CRYPTID_SETTINGS_SEQUENCE,
                    signer,
                    PDASeedSet::new(seeder, nonce),
                )
            }
        };

        // Maps to signing key and expire time
        let signers = accounts
            .signer_keys
            .iter()
            .zip(data.signers)
            .map(|(signer, expiry_time)| (signer.to_key_data(), expiry_time.1))
            .collect();

        // Assign the transaction account data
        *accounts.transaction_account.deref_mut() = TransactionAccount {
            cryptid_account: accounts.cryptid_account.info().key,
            accounts: data.accounts,
            transaction_instructions: data.instructions,
            signers,
            state: if data.ready_to_execute {
                TransactionState::Ready
            } else {
                TransactionState::NotReady
            },
            settings_sequence,
        };

        // Verify the instruction account indexes are valid
        for instruction in &accounts.transaction_account.transaction_instructions {
            for account in &instruction.accounts {
                accounts
                    .transaction_account
                    .check_account_index(account.key)?;
            }
        }

        // Set the funder for the new account
        accounts.transaction_account.funder = Some(accounts.funder.clone());
        if accounts.funder.key == signer_key {
            accounts.transaction_account.funder_seeds = Some(signer_seed_set)
        }
        // Set the seeds for the new account
        accounts.transaction_account.account_seeds =
            Some(PDASeedSet::new(transaction_seeder, transaction_nonce));
        accounts.transaction_account.init_size = InitSize::SetSize(data.account_size as u64);

        Ok(Some(accounts.system_program.clone()))
    }

    fn build_instruction(
        program_id: Pubkey,
        arg: Self::BuildArg,
    ) -> GeneratorResult<(Vec<SolanaAccountMeta>, Self::Data)> {
        let data = ProposeTransactionData {
            signers: arg
                .signers
                .iter()
                .map(|(key, expiry)| (key.extra_count(), *expiry))
                .collect(),
            account_size: arg.account_size,
            accounts: arg.accounts,
            instructions: arg.instructions,
            ready_to_execute: arg.ready_to_execute,
            account_seed: arg.account_seed.clone(),
        };

        let mut accounts = vec![
            SolanaAccountMeta::new(arg.funder, true),
            SolanaAccountMeta::new(
                TransactionSeeder {
                    cryptid_account: arg.cryptid_account,
                    seed: arg.account_seed,
                }
                .find_address(program_id)
                .0,
                false,
            ),
            SolanaAccountMeta::new_readonly(arg.cryptid_account, false),
            arg.did,
            SolanaAccountMeta::new_readonly(arg.did_program, false),
            SolanaAccountMeta::new_readonly(system_program_id(), false),
        ];
        accounts.extend(arg.signers.iter().flat_map(|(key, _)| key.to_metas()));
        Ok((accounts, data))
    }
}

/// Accounts for [`ProposeTransaction`]
#[derive(Debug, AccountArgument)]
#[account_argument(instruction_data = signers: Vec<u8>)]
pub struct ProposeTransactionAccounts {
    /// The funder that will pay the rent
    #[account_argument(writable, owner = system_program_id())]
    pub funder: AccountInfo,
    /// The account that will store the transaction information, can be init or zeroed
    pub transaction_account: InitAccount<TransactionAccount>,
    /// The cryptid account to execute for
    pub cryptid_account: CryptidAccountAddress,
    /// The DID for `cryptid_account`
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
    /// Size of the transaction account
    pub account_size: u16,
    /// Accounts for instructions
    pub accounts: Vec<Pubkey>,
    /// The instructions that will be executed
    pub instructions: Vec<InstructionData>,
    /// Whether or not the transaction is ready to execute
    pub ready_to_execute: bool,
    /// Transaction account seed
    pub account_seed: String,
}

/// Build argument for [`ProposeTransaction`]
#[derive(Debug)]
pub struct ProposeTransactionBuild {
    /// The funder that will pay the rent
    pub funder: Pubkey,
    /// The Cryptid Account to execute for
    pub cryptid_account: Pubkey,
    /// The DID for the Cryptid Account
    pub did: SolanaAccountMeta,
    /// The program for the DID
    pub did_program: Pubkey,
    /// The signing keys, need at least one to propose irrespective of the key threshold
    pub signers: Vec<(SigningKeyBuild, UnixTimestamp)>,
    /// The accounts for the instructions
    pub accounts: Vec<Pubkey>,
    /// The instructions that will be executed
    pub instructions: Vec<InstructionData>,
    /// Whether or not the transaction is ready to execute
    pub ready_to_execute: bool,
    /// Size of the transaction account
    pub account_size: u16,
    /// Transaction account seed
    pub account_seed: String,
}
