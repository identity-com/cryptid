use crate::account::CryptidAccountAddress;
use crate::error::CryptidSignerError;
use crate::instruction::{verify_keys, SigningKey, SigningKeyBuild};
use crate::state::{InstructionData, TransactionAccount, TransactionAccountMeta, TransactionState};
use crate::TransactionSeeder;
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use sol_did::solana_program::pubkey::Pubkey;
use solana_generator::*;
use std::array::IntoIter;
use std::iter::once;

/// Expands an already proposed instruction
#[derive(Debug)]
pub struct ExpandTransaction;
impl Instruction for ExpandTransaction {
    type Data = ExpandTransactionData;
    type FromAccountsData = ();
    type Accounts = ExpandTransactionAccounts;
    type BuildArg = ExpandTransactionBuild;

    fn data_to_instruction_arg(_data: &mut Self::Data) -> GeneratorResult<Self::FromAccountsData> {
        Ok(())
    }

    fn process(
        program_id: Pubkey,
        data: Self::Data,
        accounts: &mut Self::Accounts,
    ) -> GeneratorResult<Option<SystemProgram>> {
        verify_keys(
            &accounts.did_program,
            &accounts.did,
            once(&accounts.signing_key),
        )?;
        accounts.cryptid_account.verify_cryptid_account(
            &program_id,
            &accounts.did_program.key,
            &accounts.did.key,
        )?;

        if accounts.transaction_account.cryptid_account != accounts.cryptid_account.info().key {
            return Err(GeneratorError::InvalidAccount {
                account: accounts.cryptid_account.info().key,
                expected: accounts.transaction_account.cryptid_account,
            }
            .into());
        }

        if accounts.transaction_account.state != TransactionState::NotReady {
            return Err(CryptidSignerError::InvalidTransactionState {
                expected: TransactionState::NotReady,
                found: accounts.transaction_account.state,
            }
            .into());
        }

        let signing_key_data = accounts.signing_key.to_key_data();
        if !accounts
            .transaction_account
            .signers
            .iter()
            .any(|signer| signer.0 == signing_key_data)
        {
            return Err(CryptidSignerError::KeyCannotChangeTransaction {
                key: signing_key_data,
            }
            .into());
        }

        for (index, account_operation) in data.account_operations.into_iter().enumerate() {
            if let Err(error) =
                handle_account_operation(&mut accounts.transaction_account, account_operation)
            {
                msg!("Error in account operation {}", index);
                return Err(error);
            }
        }
        for (index, instruction_operation) in data.instruction_operations.into_iter().enumerate() {
            if let Err(error) = handle_instruction_operation(
                &mut accounts.transaction_account,
                instruction_operation,
            ) {
                msg!("Error in instruction operation {}", index);
                return Err(error);
            }
        }
        accounts.transaction_account.state = data.transaction_state;

        Ok(None)
    }

    fn build_instruction(
        program_id: Pubkey,
        arg: Self::BuildArg,
    ) -> GeneratorResult<(Vec<SolanaAccountMeta>, Self::Data)> {
        Ok((
            IntoIter::new([
                SolanaAccountMeta::new(
                    match arg.transaction_account {
                        SeedOrAccount::Seed(seed) => {
                            TransactionSeeder {
                                cryptid_account: arg.cryptid_account,
                                seed,
                            }
                            .find_address(program_id)
                            .0
                        }
                        SeedOrAccount::Account(account) => account,
                    },
                    false,
                ),
                SolanaAccountMeta::new_readonly(arg.cryptid_account, false),
                arg.did,
                SolanaAccountMeta::new_readonly(arg.did_program, false),
            ])
            .chain(arg.signing_key.to_metas())
            .collect(),
            ExpandTransactionData {
                transaction_state: arg.new_state,
                account_operations: arg.account_operations,
                instruction_operations: arg.instruction_operations,
            },
        ))
    }
}

/// The accounts for [`ExpandTransaction`]
#[derive(Debug, AccountArgument)]
pub struct ExpandTransactionAccounts {
    /// The transaction account to expand
    #[account_argument(writable)]
    pub transaction_account: ProgramAccount<TransactionAccount>,
    /// The cryptid account for the transaction
    pub cryptid_account: CryptidAccountAddress,
    /// The did for the cryptid account
    pub did: AccountInfo,
    /// The did program for the did
    pub did_program: AccountInfo,
    /// The key that's signing the change to the transaction
    pub signing_key: SigningKey,
}

/// The data for [`ExpandTransaction`]
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct ExpandTransactionData {
    /// The new state of the transaction after changes
    pub transaction_state: TransactionState,
    /// Operations to execute on the accounts
    pub account_operations: Vec<AccountOperation>,
    /// Operations to execute on the instructions
    pub instruction_operations: Vec<InstructionOperation>,
}

/// The builder for [`ExpandTransaction`]
#[derive(Debug)]
pub struct ExpandTransactionBuild {
    /// The transaction account to expand
    pub transaction_account: SeedOrAccount,
    /// The cryptid account for the transaction
    pub cryptid_account: Pubkey,
    /// The did for the cryptid account
    pub did: SolanaAccountMeta,
    /// The did program for the did
    pub did_program: Pubkey,
    /// The key that's signing the change to the transaction
    pub signing_key: SigningKeyBuild,
    /// The new state of the transaction after changes
    pub new_state: TransactionState,
    /// Operations to execute on the accounts
    pub account_operations: Vec<AccountOperation>,
    /// Operations to execute on the instructions
    pub instruction_operations: Vec<InstructionOperation>,
}

/// Transaction account that can come from a seed or key
#[derive(Debug, Clone)]
pub enum SeedOrAccount {
    /// The seed for the transaction account
    Seed(String),
    /// The key of the transaction account
    Account(Pubkey),
}
impl SeedOrAccount {
    /// Turns this into a public key
    pub fn into_key(self, cryptid_account: &Pubkey, program_id: &Pubkey) -> Pubkey {
        match self {
            Self::Seed(seed) => {
                TransactionSeeder {
                    cryptid_account: *cryptid_account,
                    seed,
                }
                .find_address(*program_id)
                .0
            }
            Self::Account(key) => key,
        }
    }
}

/// An operation on the accounts of a transaction
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema, Clone)]
pub enum AccountOperation {
    /// Adds a given account to the end
    Add(Pubkey),
    /// Clears the accounts and instructions
    Clear,
    /// Adds many keys at once
    AddMany(Vec<Pubkey>),
}

/// An operation on the instructions in a transaction
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema, Clone)]
pub enum InstructionOperation {
    /// Adds an instruction
    Add(InstructionData),
    /// Removes an instruction
    Remove(u8),
    /// Adds an account to an instruction
    AddAccount {
        /// The index of the instruction
        #[allow(dead_code)] //TODO: Figure out why this needs to be here
        index: u8,
        /// The account to add
        #[allow(dead_code)] //TODO: Figure out why this needs to be here
        account: TransactionAccountMeta,
    },
    /// Adds multiple accounts to an instruction. More space efficient than [`InstructionOperation::AddAccount`] when adding > 5 accounts.
    AddAccounts {
        /// The index of the instruction
        #[allow(dead_code)] //TODO: Figure out why this needs to be here
        index: u8,
        /// The accounts to add
        #[allow(dead_code)] //TODO: Figure out why this needs to be here
        accounts: Vec<TransactionAccountMeta>,
    },
    /// Clears the accounts of an instruction
    ClearAccounts(u8),
    /// Adds data to an instruction
    AddData {
        /// The index of the instruction
        #[allow(dead_code)] //TODO: Figure out why this needs to be here
        index: u8,
        /// The data to add
        #[allow(dead_code)] //TODO: Figure out why this needs to be here
        data: Vec<u8>,
    },
    /// Clears the data of an instruction
    ClearData(u8),
    /// Clears all instructions
    Clear,
}
fn handle_instruction_operation(
    transaction: &mut TransactionAccount,
    operation: InstructionOperation,
) -> GeneratorResult<()> {
    match operation {
        InstructionOperation::Add(instruction) => {
            for account in &instruction.accounts {
                transaction.check_account_index(account.key)?;
            }
            transaction.transaction_instructions.push(instruction);
        }
        InstructionOperation::Remove(index) => {
            transaction.check_instruction_index(index)?;
            transaction.transaction_instructions.remove(index as usize);
        }
        InstructionOperation::AddAccount { index, account } => {
            transaction.check_account_index(account.key)?;
            transaction
                .get_instruction_mut(index)?
                .accounts
                .push(account);
        }
        InstructionOperation::AddAccounts { index, accounts } => {
            for account in &accounts {
                transaction.check_account_index(account.key)?;
            }
            transaction
                .get_instruction_mut(index)?
                .accounts
                .extend(accounts.into_iter());
        }
        InstructionOperation::ClearAccounts(index) => {
            transaction.get_instruction_mut(index)?.accounts.clear();
        }
        InstructionOperation::AddData { index, data } => {
            transaction
                .get_instruction_mut(index)?
                .data
                .extend(data.into_iter());
        }
        InstructionOperation::ClearData(index) => {
            transaction.get_instruction_mut(index)?.data.clear();
        }
        InstructionOperation::Clear => transaction.transaction_instructions.clear(),
    }
    Ok(())
}

fn handle_account_operation(
    transaction: &mut TransactionAccount,
    operation: AccountOperation,
) -> GeneratorResult<()> {
    match operation {
        AccountOperation::Add(account) => transaction.accounts.push(account),
        AccountOperation::Clear => {
            transaction.transaction_instructions.clear();
            transaction.accounts.clear();
        }
        AccountOperation::AddMany(accounts) => transaction.accounts.extend(accounts.into_iter()),
    }
    Ok(())
}
