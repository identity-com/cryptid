//! Instructions for `cryptid_signer`

/// Crates a cryptid account
#[path = "./000_create_cryptid.rs"]
pub mod create_cryptid;
/// Directly executes a transaction
#[path = "./005_direct_execute.rs"]
pub mod direct_execute;
/// Executes a transaction
#[path = "./003_execute_transaction.rs"]
pub mod execute_transaction;
/// Expands a proposed transaction
#[path = "./002_expand_transaction.rs"]
pub mod expand_transaction;
/// Proposes a transaction
#[path = "./001_propose_transaction.rs"]
pub mod propose_transaction;
/// A test instruction
#[path = "./254_test_instruction.rs"]
pub mod test_instruction;

use std::borrow::Cow;

use crate::error::CryptidSignerError;
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use solana_generator::solana_program::program_error::ProgramError;
use solana_generator::*;
use std::iter::once;

use create_cryptid::CreateCryptid;
use direct_execute::DirectExecute;
use execute_transaction::ExecuteTransaction;
use expand_transaction::ExpandTransaction;
use propose_transaction::ProposeTransaction;
use test_instruction::TestInstruction;

/// The instructions for `cryptid_signer`
#[allow(clippy::large_enum_variant)]
#[derive(Debug, Copy, Clone, InstructionList)]
pub enum CryptidInstruction {
    /// A test instruction that logs a success message
    #[instruction_list(instruction = TestInstruction, discriminant = 254)]
    Test,
    /// Creates a new Cryptid Account on-chain
    #[instruction_list(instruction = CreateCryptid, discriminant = 0)]
    CreateCryptid,
    /// Proposes a new transaction that can be approved and appended to
    #[instruction_list(instruction = ProposeTransaction, discriminant = 1)]
    ProposeTransaction,
    /// Expands a transaction
    #[instruction_list(instruction = ExpandTransaction, discriminant = 2)]
    ExpandTransaction,
    /// Executes a transaction
    #[instruction_list(instruction = ExecuteTransaction, discriminant = 3)]
    ExecuteTransaction,
    /// Executes a transaction directly if all required keys sign
    #[instruction_list(instruction = DirectExecute, discriminant = 5)]
    DirectExecute,
}

/// Verifies the given keys are valid.
/// Currently only checks that there is a single valid key for `sol-did` and lets all other program through without checks
pub fn verify_keys<'a>(
    did_program: &AccountInfo,
    did: &AccountInfo,
    signing_keys: impl Iterator<Item = &'a SigningKey>,
) -> GeneratorResult<()> {
    // TODO: Handle higher key threshold than 1
    if did_program.key == sol_did::id() {
        for signing_key in signing_keys {
            // Safety: This is safe because the generated references are not leaked or used after another use of the value they came from
            unsafe {
                sol_did::validate_owner(
                    &did.to_solana_account_info(),
                    &signing_key.signing_key.to_solana_account_info(),
                    signing_key
                        .extra_accounts
                        .iter()
                        .map(|info| info.to_solana_account_info())
                        .map(Cow::Owned),
                )?;
            }
        }
        Ok(())
    } else {
        //TODO: Verify signing key against did using interface
        Err(CryptidSignerError::UnsupportedDIDProgram {
            program: did_program.key,
        }
        .into())
    }
}

/// A key that signs for a did.
/// Has a single account that is the signature (may or may not be a solana signature) and a variable number of accounts for the DID program.
#[derive(Debug, AccountArgument)]
#[account_argument(instruction_data = extra_accounts: u8)]
pub struct SigningKey {
    /// The key that constitutes the signature
    pub signing_key: AccountInfo,
    /// Extra accounts for the DID program
    #[account_argument(instruction_data = extra_accounts as usize)]
    pub extra_accounts: Vec<AccountInfo>,
}
impl SigningKey {
    /// Turns the keys into a string
    pub fn to_key_string(&self) -> String {
        format!(
            "({}, {:?})",
            self.signing_key.key,
            self.extra_accounts
                .iter()
                .map(|extra| extra.key)
                .collect::<Vec<_>>()
        )
    }

    /// Turns the keys into the on-chain data format
    pub fn to_key_data(&self) -> SigningKeyData {
        SigningKeyData {
            key: self.signing_key.key,
            extra_keys: self
                .extra_accounts
                .iter()
                .map(|account| account.key)
                .collect(),
        }
    }
}
impl FromAccounts<()> for SigningKey {
    fn from_accounts(
        _program_id: Pubkey,
        infos: &mut impl AccountInfoIterator,
        _arg: (),
    ) -> GeneratorResult<Self> {
        let signing_key = infos.next().ok_or(ProgramError::NotEnoughAccountKeys)?;
        let extra_accounts = infos.collect();
        Ok(Self {
            signing_key,
            extra_accounts,
        })
    }
}

/// The on-chain format of [`SigningKey`]
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema, Eq, PartialEq, Clone)]
pub struct SigningKeyData {
    /// The signing key
    pub key: Pubkey,
    /// Extra keys needed for signing
    pub extra_keys: Vec<Pubkey>,
}
impl SigningKeyData {
    /// Calculates the on-chain size of a [`SigningKeyData`]
    pub const fn calculate_size(num_extras: usize) -> usize {
        32 //key
        + 4 + 32 * num_extras //extra_keys
    }
}

/// A builder for [`SigningKey`]
#[derive(Debug, Clone)]
pub struct SigningKeyBuild {
    /// The key that constitutes the signature
    pub signing_key: SolanaAccountMeta,
    /// Extra accounts for the DID program
    pub extra_accounts: Vec<SolanaAccountMeta>,
}
impl SigningKeyBuild {
    /// Turns `self` into an iterator of [`SolanaAccountMeta`]s
    pub fn to_metas(&self) -> impl Iterator<Item = SolanaAccountMeta> + '_ {
        once(self.signing_key.clone()).chain(self.extra_accounts.iter().cloned())
    }

    /// Returns the size of [`SigningKeyBuild::extra_accounts`]
    pub fn extra_count(&self) -> u8 {
        self.extra_accounts.len() as u8
    }

    /// Turns this into a [`SigningKeyData`]
    pub fn to_data(&self) -> SigningKeyData {
        SigningKeyData {
            key: self.signing_key.pubkey,
            extra_keys: self
                .extra_accounts
                .iter()
                .map(|account| account.pubkey)
                .collect(),
        }
    }
}
